import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { storeMessageMetadata, getMessageMetadata, updateMessageStatus } from "./blockchain-service"

const supabase = createClient(
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
}

// Local storage key for messages
const MESSAGES_STORAGE_KEY = "cybershield_messages"

// Get messages from local storage
export function getLocalMessages(): Message[] {
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_STORAGE_KEY) || "[]")
  } catch (error) {
    console.error("Error getting messages from local storage:", error)
    return []
  }
}

// Save messages to local storage
export function saveLocalMessages(messages: Message[]) {
  localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages))
}

// Add a message to local storage
export function addLocalMessage(message: Message) {
  const messages = getLocalMessages()
  messages.unshift(message) // Add to beginning of array
  saveLocalMessages(messages)
}

// Try to save message to Supabase and blockchain
export async function saveMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
  try {
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    // Save message to Supabase
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          id: messageId,
          sender_email: message.sender_email,
          recipient_email: message.recipient_email,
          encrypted_content: message.encrypted_content,
          created_at: timestamp,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Store metadata in blockchain
    try {
      await fetch('/api/blockchain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'store',
          messageId,
          metadata: {
            sender_email: message.sender_email,
            recipient_email: message.recipient_email,
            timestamp,
            status: 'sent',
          },
        }),
      });
    } catch (error) {
      console.error('Failed to store metadata in blockchain:', error);
      // Continue even if blockchain storage fails
    }

    return data;
  } catch (error) {
    console.error('Error saving message:', error);
    throw new Error('Failed to save message');
  }
}

// Get messages for a user, combining Supabase, local storage, and blockchain metadata
export async function getMessagesForUser(email: string): Promise<{ received: Message[]; sent: Message[] }> {
  try {
    // Get received messages
    const { data: receivedData, error: receivedError } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_email', email)
      .order('created_at', { ascending: false });

    if (receivedError) {
      throw receivedError;
    }

    // Get sent messages
    const { data: sentData, error: sentError } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_email', email)
      .order('created_at', { ascending: false });

    if (sentError) {
      throw sentError;
    }

    // For each message, try to get blockchain metadata
    const enrichMessages = async (messages: Message[]) => {
      return Promise.all(
        messages.map(async (message) => {
          try {
            const response = await fetch(`/api/blockchain?messageId=${message.id}`);
            const { metadata } = await response.json();
            return { ...message, metadata };
          } catch (error) {
            console.error('Failed to fetch blockchain metadata:', error);
            return message;
          }
        })
      );
    };

    const [enrichedReceived, enrichedSent] = await Promise.all([
      enrichMessages(receivedData),
      enrichMessages(sentData),
    ]);

    return {
      received: enrichedReceived,
      sent: enrichedSent,
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw new Error('Failed to fetch messages');
  }
}

