import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, TrendingUp, TrendingDown, Calendar, 
  Wheat, ShoppingBag, Home, Stethoscope, GraduationCap,
  Filter, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  icon: React.ElementType;
}

const transactions: Transaction[] = [
  { id: 1, type: 'income', amount: 8000, category: 'फसल बिक्री', description: 'गेहूं बिक्री', date: '20 दिसंबर', icon: Wheat },
  { id: 2, type: 'expense', amount: 2500, category: 'खाद', description: 'DAP खाद', date: '18 दिसंबर', icon: Wheat },
  { id: 3, type: 'expense', amount: 1500, category: 'राशन', description: 'महीने का राशन', date: '15 दिसंबर', icon: ShoppingBag },
  { id: 4, type: 'expense', amount: 800, category: 'स्वास्थ्य', description: 'दवाई', date: '12 दिसंबर', icon: Stethoscope },
  { id: 5, type: 'income', amount: 2000, category: 'सरकारी योजना', description: 'PM किसान किस्त', date: '10 दिसंबर', icon: TrendingUp },
  { id: 6, type: 'expense', amount: 3000, category: 'शिक्षा', description: 'स्कूल फीस', date: '5 दिसंबर', icon: GraduationCap },
];

const Khata = () => {
  const [activeTab, setActiveTab] = useState('all');

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const filteredTransactions = activeTab === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === activeTab);

  return (
    <AppLayout>
      <div className="container px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">मेरा खाता</h1>
            <p className="text-sm text-muted-foreground">दिसंबर 2024</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-md bg-accent/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent-foreground" />
                <span className="text-sm text-muted-foreground">आमदनी</span>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{totalIncome.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span className="text-sm text-muted-foreground">खर्च</span>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{totalExpense.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">सभी</TabsTrigger>
            <TabsTrigger value="income">आमदनी</TabsTrigger>
            <TabsTrigger value="expense">खर्च</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {filteredTransactions.map((transaction) => (
              <Card key={transaction.id} className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    transaction.type === 'income' 
                      ? "bg-accent/50 text-accent-foreground" 
                      : "bg-destructive/10 text-destructive"
                  )}>
                    <transaction.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{transaction.category} • {transaction.date}</p>
                  </div>
                  <p className={cn(
                    "font-semibold",
                    transaction.type === 'income' ? "text-accent-foreground" : "text-destructive"
                  )}>
                    {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Add Button */}
        <Button className="w-full gap-2" size="lg">
          <Plus className="w-5 h-5" />
          नया लेन-देन जोड़ें
        </Button>
      </div>
    </AppLayout>
  );
};

export default Khata;
