"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield, Send, LogOut, User, RefreshCw, Mail, Key, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { encryptMessage, decryptMessage } from "@/lib/encryption"
import { ThemeToggle } from "@/components/theme-toggle"
import { type Message, getMessagesForUser, saveMessage } from "@/lib/message-service"
import { KeyDisplay } from "@/components/key-display"

type MessageWithDecrypted = Message & {
  decrypted_content?: string
}

interface BlockchainMetadata {
  sender_email: string;
  recipient_email: string;
}

export default function DashboardPage() {
  const [recipientEmail, setRecipientEmail] = useState("")
  const [messageContent, setMessageContent] = useState("")
  const [recipientPublicKey, setRecipientPublicKey] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [showOwnKeys, setShowOwnKeys] = useState(false)
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null)
  const [receivedMessages, setReceivedMessages] = useState<MessageWithDecrypted[]>([])
  const [sentMessages, setSentMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState("")
  const [fetchingKey, setFetchingKey] = useState(false)
  const [keyFetchError, setKeyFetchError] = useState("")
  const [usingLocalStorage, setUsingLocalStorage] = useState(false)
  const [messageId, setMessageId] = useState('')
  const [metadata, setMetadata] = useState<BlockchainMetadata>({ 
    sender_email: '', 
    recipient_email: '' 
  })
  const router = useRouter()
  const { user, signOut, getPrivateKeyLocally } = useAuth()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    // Get private key from local storage
    const userPrivateKey = getPrivateKeyLocally()
    if (userPrivateKey) {
      setPrivateKey(userPrivateKey)
    }

    // Get user's public key
    const fetchUserPublicKey = async () => {
      if (user.email) {
        try {
          const response = await fetch(`/api/keys?email=${user.email}`)
          const data = await response.json()
          if (data.publicKey) {
            setUserPublicKey(data.publicKey)
          }
        } catch (error) {
          console.error('Error fetching public key:', error)
        }
      }
    }
    fetchUserPublicKey()

    const fetchMessages = async () => {
      try {
        setLoading(true)
        if (!user.email) return

        const { received, sent } = await getMessagesForUser(user.email)

        // Check if we're using local storage
        if (received.some((msg) => "local" in msg) || sent.some((msg) => "local" in msg)) {
          setUsingLocalStorage(true)
        }

        setReceivedMessages(received)
        setSentMessages(sent)
      } catch (error) {
        console.error("Error fetching messages:", error)
        setUsingLocalStorage(true)
      } finally {
        setLoading(false)
      }
    }
    fetchMessages()
  }, [user, router, getPrivateKeyLocally])

  const fetchRecipientPublicKey = async () => {
    if (!recipientEmail) {
      setKeyFetchError("Please enter a recipient email")
      return
    }

    try {
      setFetchingKey(true)
      setKeyFetchError("")
      setError("")

      const response = await fetch(`/api/keys?email=${recipientEmail}`)
      const data = await response.json()
      
      if (!response.ok) {
        setKeyFetchError(data.error || "Failed to fetch recipient's public key")
        return
      }
      
      if (data.publicKey) {
        setRecipientPublicKey(data.publicKey)
      } else {
        setKeyFetchError("Recipient not found or has no public key")
      }
    } catch (error) {
      console.error("Error fetching recipient key:", error)
      setKeyFetchError("Failed to fetch recipient's public key")
    } finally {
      setFetchingKey(false)
    }
  }

  const handleSendMessage = async () => {
    if (!user || !user.email || !recipientEmail || !messageContent || !recipientPublicKey) {
      setError("Please fill in all fields and fetch the recipient's public key")
      return
    }

    try {
      setSendingMessage(true)
      setError("")

      // Encrypt message with recipient's public key
      const encryptedContent = encryptMessage(messageContent, recipientPublicKey)

      // Save message
      const result = await saveMessage({
        sender_email: user.email,
        recipient_email: recipientEmail,
        encrypted_content: encryptedContent,
      })

      // Clear form
      setRecipientEmail("")
      setMessageContent("")
      setRecipientPublicKey("")

      // Refresh messages
      if (user.email) {
        const { received, sent } = await getMessagesForUser(user.email)
        setReceivedMessages(received)
        setSentMessages(sent)
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      setError(error.message || "Failed to send message")
    } finally {
      setSendingMessage(false)
    }
  }

  const decryptReceivedMessage = (message: MessageWithDecrypted) => {
    if (!privateKey) {
      setError("Private key not found. Please ensure you have saved your private key.")
      return
    }

    try {
      const decryptedContent = decryptMessage(message.encrypted_content, privateKey)

      // Update the message with decrypted content
      setReceivedMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === message.id ? { ...msg, decrypted_content: decryptedContent } : msg)),
      )
    } catch (error) {
      console.error("Error decrypting message:", error)
      setError("Failed to decrypt message. The private key may be incorrect.")
    }
  }

  const handleRefreshMessages = async () => {
    if (!user || !user.email) return

    setLoading(true)
    try {
      const { received, sent } = await getMessagesForUser(user.email)
      setReceivedMessages(received)
      setSentMessages(sent)
    } catch (error) {
      console.error("Error refreshing messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  const storeMetadata = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/blockchain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'store',
          messageId,
          metadata: {
            ...metadata,
            sender_email: user.email,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('Metadata stored successfully');
      } else {
        console.error('Failed to store metadata');
      }
    } catch (error) {
      console.error('Error storing metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Secure Messaging</h1>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Send Message Section */}
          <Card>
            <CardHeader>
              <CardTitle>Send Encrypted Message</CardTitle>
              <CardDescription>
                Messages are encrypted with the recipient's public key and can only be decrypted with their private key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Recipient's email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
                <Button onClick={fetchRecipientPublicKey} disabled={fetchingKey}>
                  {fetchingKey ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Get Key
                </Button>
              </div>
              {keyFetchError && (
                <Alert variant="destructive">
                  <Info className="w-4 h-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{keyFetchError}</AlertDescription>
                </Alert>
              )}
              {recipientPublicKey && (
                <Alert>
                  <Key className="w-4 h-4" />
                  <AlertTitle>Public Key Retrieved</AlertTitle>
                  <AlertDescription className="font-mono text-xs break-all">
                    {recipientPublicKey}
                  </AlertDescription>
                </Alert>
              )}
              <Textarea
                placeholder="Type your message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleSendMessage} disabled={sendingMessage || !recipientPublicKey}>
                {sendingMessage ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Encrypted Message
              </Button>
            </CardFooter>
          </Card>

          {/* Messages Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Messages</CardTitle>
                <Button variant="outline" onClick={handleRefreshMessages} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="received">
                <TabsList className="w-full">
                  <TabsTrigger value="received" className="flex-1">
                    <Mail className="w-4 h-4 mr-2" />
                    Received
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="flex-1">
                    <Send className="w-4 h-4 mr-2" />
                    Sent
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="received">
                  {receivedMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No messages received yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {receivedMessages.map((message) => (
                        <Card key={message.id}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-sm">From: {message.sender_email}</CardTitle>
                                <CardDescription>
                                  {new Date(message.created_at).toLocaleString()}
                                </CardDescription>
                              </div>
                              {!message.decrypted_content && (
                                <Button
                                  variant="outline"
                                  onClick={() => decryptReceivedMessage(message)}
                                >
                                  <Key className="w-4 h-4 mr-2" />
                                  Decrypt
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            {message.decrypted_content ? (
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="whitespace-pre-wrap">{message.decrypted_content}</p>
                              </div>
                            ) : (
                              <div className="font-mono text-xs break-all text-muted-foreground">
                                {message.encrypted_content}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="sent">
                  {sentMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No messages sent yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sentMessages.map((message) => (
                        <Card key={message.id}>
                          <CardHeader>
                            <CardTitle className="text-sm">To: {message.recipient_email}</CardTitle>
                            <CardDescription>
                              {new Date(message.created_at).toLocaleString()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="font-mono text-xs break-all text-muted-foreground">
                              {message.encrypted_content}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Keys Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Keys</CardTitle>
              <CardDescription>
                Your public key is shared with others to send you encrypted messages. 
                Keep your private key secure and never share it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <KeyDisplay
                  label="Public Key"
                  value={userPublicKey || ''}
                  type="public"
                />
                <KeyDisplay
                  label="Private Key"
                  value={privateKey}
                  type="private"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

