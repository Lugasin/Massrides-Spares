import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const Messages: React.FC = () => {
  // Placeholder data for conversations
  const placeholderConversations = [
    { id: 'conv1', contactName: 'Vendor A', lastMessage: 'Do you have this in stock?', timestamp: '10:00 AM' },
    { id: 'conv2', contactName: 'Client B', lastMessage: 'Quote request sent.', timestamp: 'Yesterday' },
    { id: 'conv3', contactName: 'Vendor C', lastMessage: 'Okay, will prepare.', timestamp: '2 days ago' },
  ];

  // Placeholder data for messages in a conversation
  const placeholderMessages = [
    { id: 'msg1', sender: 'Client', text: 'Hello Vendor A, I\'m interested in the combine harvester.', timestamp: '9:58 AM' },
    { id: 'msg2', sender: 'Vendor A', text: 'Hi Client! Which model are you looking at?', timestamp: '9:59 AM' },
    { id: 'msg3', sender: 'Client', text: 'Do you have this in stock?', timestamp: '10:00 AM' },
  ];

  const [selectedConversation, setSelectedConversation] = useState(placeholderConversations[0]);
  const [newMessageText, setNewMessageText] = useState('');

  const handleSendMessage = () => {
    if (newMessageText.trim()) {
      console.log('Sending message:', newMessageText, 'to conversation:', selectedConversation.contactName);
      // TODO: Implement actual message sending logic
      setNewMessageText('');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 h-[80vh]"> {/* Added h-[80vh] for better layout in demo */}
      <Card className="h-full flex">
        {/* Conversations List */}
        <div className="w-1/3 border-r">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Conversations</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-80px)]"> {/* Adjust height */}
            {placeholderConversations.map(conv => (
              <div
                key={conv.id}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${selectedConversation.id === conv.id ? 'bg-muted/50' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="font-semibold">{conv.contactName}</div>
                <div className="text-sm text-muted-foreground truncate">{conv.lastMessage}</div>
                <div className="text-xs text-muted-foreground mt-1">{conv.timestamp}</div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Message Thread */}
        <div className="flex-1 flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-bold">{selectedConversation?.contactName || 'Select a Conversation'}</CardTitle>
          </CardHeader>
          {selectedConversation ? (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {placeholderMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'Client' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-lg ${msg.sender === 'Client' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <div className="font-semibold text-sm mb-1">{msg.sender}</div>
                        <div>{msg.text}</div>
                        <div className="text-xs mt-1 opacity-80 text-right">{msg.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t flex items-center gap-2">
                <Textarea
                  placeholder="Type your message..."
                  className="flex-1 resize-none min-h-[40px]"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage} className="shrink-0">Send</Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start messaging.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Messages;