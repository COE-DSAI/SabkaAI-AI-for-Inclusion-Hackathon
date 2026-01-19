import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, Send, Bot, User, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    content: 'नमस्ते राम जी! मैं आपका ग्रामीण साथी हूं। आज मैं आपकी क्या मदद कर सकता हूं? आप बोलकर या लिखकर पूछ सकते हैं।',
    timestamp: new Date(),
  },
  {
    id: 2,
    role: 'assistant',
    content: '💡 सुझाव: पिछली बार आपने खाद के बारे में पूछा था। इस साल की रबी के लिए DAP खाद का सही समय अगले 15 दिनों में है।',
    timestamp: new Date(),
  },
];

const Saathi = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages([...messages, newMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const response: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: getAIResponse(input),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const getAIResponse = (query: string): string => {
    if (query.includes('बचत') || query.includes('पैसा')) {
      return 'राम जी, आपकी पिछली 3 महीने की आय ₹45,000 रही और खर्च ₹38,000। आप हर महीने ₹2,000 और बचा सकते हैं अगर त्यौहार खर्च को थोड़ा कम करें। क्या मैं आपको एक बचत योजना बनाकर दूं?';
    }
    if (query.includes('योजना') || query.includes('सरकारी')) {
      return 'आपके लिए 3 नई योजनाएं मिली हैं! PM किसान में ₹2,000 की किस्त अगले महीने आएगी। क्या आप फसल बीमा योजना के बारे में जानना चाहेंगे?';
    }
    return 'समझ गया राम जी। इस बारे में मैं आपकी मदद करूंगा। क्या आप थोड़ा और विस्तार से बता सकते हैं?';
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    // Voice recognition would be implemented here
  };

  return (
    <AppLayout>
      <div className="container px-4 py-4 flex flex-col h-[calc(100vh-8rem)]">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' && "flex-row-reverse"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                message.role === 'assistant' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-secondary-foreground"
              )}>
                {message.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <Card className={cn(
                "max-w-[80%] border-none",
                message.role === 'assistant' 
                  ? "bg-card" 
                  : "bg-primary text-primary-foreground"
              )}>
                <CardContent className="p-3">
                  <p className="text-sm">{message.content}</p>
                  {message.role === 'assistant' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Volume2 className="w-3 h-3 mr-1" />
                      सुनें
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Voice Animation */}
        {isListening && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 20}px`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
            <p className="ml-3 text-sm text-muted-foreground">सुन रहा हूं...</p>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            className={cn(
              "shrink-0",
              isListening && "animate-pulse"
            )}
            onClick={toggleListening}
          >
            <Mic className="w-5 h-5" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="यहां लिखें या बोलें..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Saathi;
