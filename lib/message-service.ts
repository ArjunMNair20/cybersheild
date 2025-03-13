import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { storeMessageMetadata, getMessageMetadata, updateMessageStatus } from "./blockchain-service"
import { supabase } from "./supabase-config"

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type BlockchainMetadata = {
  messageId: string
  sender: string
  recipient: string
  timestamp: string
  status: string
  lastUpdated?: string
}

export interface Message {
  id: string;
  sender_email: string;
  recipient_email: string;
  encrypted_content: string;
  created_at: string;
  blockchain_metadata?: BlockchainMetadata
  local?: boolean // Flag to indicate if message is from local storage
}

// Local storage key for messages
const MESSAGES_STORAGE_KEY = "cybershield_messages"

// Get messages from local storage
function getLocalMessages(): Message[] {
  try {
    const messages = localStorage.getItem(MESSAGES_STORAGE_KEY)
    return messages ? JSON.parse(messages) : []
  } catch (error) {
    console.error("Error reading from local storage:", error)
    return []
  }
}

// Save messages to local storage
function saveLocalMessages(messages: Message[]) {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages))
  } catch (error) {
    console.error("Error saving to local storage:", error)
  }
}

// Add a message to local storage
function addLocalMessage(message: Message) {
  try {
    const messages = getLocalMessages()
    messages.unshift({ ...message, local: true })
    saveLocalMessages(messages)
  } catch (error) {
    console.error("Error adding message to local storage:", error)
  }
}

// Save message to Supabase with local storage fallback
export async function saveMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
  try {
    const messageId = uuidv4()
    const timestamp = new Date().toISOString()
    
    const newMessage = {
      id: messageId,
      sender_email: message.sender_email,
      recipient_email: message.recipient_email,
      encrypted_content: message.encrypted_content,
      created_at: timestamp
    }

    // Try to save to Supabase
    const { data, error } = await supabaseClient
      .from('messages')
      .insert([newMessage])
      .select()
      .single()

    if (error) {
      // If Supabase fails, save to local storage
      console.warn("Failed to save to Supabase, falling back to local storage")
      addLocalMessage(newMessage)
      return { ...newMessage, local: true }
    }

    return data
  } catch (error) {
    console.error("Error in saveMessage:", error)
    // In case of any error, save to local storage
    const localMessage = {
      id: uuidv4(),
      sender_email: message.sender_email,
      recipient_email: message.recipient_email,
      encrypted_content: message.encrypted_content,
      created_at: new Date().toISOString(),
      local: true
    }
    addLocalMessage(localMessage)
    return localMessage
  }
}

// Get messages for a user from both Supabase and local storage
export async function getMessagesForUser(email: string): Promise<{ received: Message[]; sent: Message[] }> {
  try {
    // Initialize with local messages
    let received: Message[] = []
    let sent: Message[] = []

    // Try to get messages from Supabase
    try {
      // Get received messages
      const { data: receivedData, error: receivedError } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('recipient_email', email)
        .order('created_at', { ascending: false })

      if (!receivedError && receivedData) {
        received = receivedData
      }

      // Get sent messages
      const { data: sentData, error: sentError } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('sender_email', email)
        .order('created_at', { ascending: false })

      if (!sentError && sentData) {
        sent = sentData
      }
    } catch (error) {
      console.warn("Failed to fetch messages from Supabase:", error)
    }

    // Get local messages
    const localMessages = getLocalMessages()
    const localReceived = localMessages.filter(m => m.recipient_email === email)
    const localSent = localMessages.filter(m => m.sender_email === email)

    // Combine and sort messages
    received = [...received, ...localReceived].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    sent = [...sent, ...localSent].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return { received, sent }
  } catch (error) {
    console.error("Error in getMessagesForUser:", error)
    
    // If everything fails, return only local messages
    const localMessages = getLocalMessages()
    return {
      received: localMessages.filter(m => m.recipient_email === email),
      sent: localMessages.filter(m => m.sender_email === email)
    }
  }
}

