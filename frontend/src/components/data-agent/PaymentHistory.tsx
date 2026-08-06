import { useState, useEffect } from "react";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CreditCard, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Payment {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount_inr: number;
  status: string;
  created_at: string;
}

interface Subscription {
  id: string;
  plan_name: string;
  plan_slug: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
}

const PaymentHistory = () => {
  const { getPaymentHistory, cancelSubscription, requestRefund, loading } = useRazorpay();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const data = await getPaymentHistory();
      setPayments(data.payments || []);
      setSubscriptions(data.subscriptions || []);
    } catch (err: any) {
      toast({ title: "Failed to load history", description: err.message, variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCancel = async (subId: string) => {
    setActionLoading(subId);
    try {
      await cancelSubscription(subId);
      toast({ title: "Subscription cancelled" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Cancel failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      await requestRefund(paymentId);
      toast({ title: "Refund initiated" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Refund failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const isRefundable = (payment: Payment) => {
    if (payment.status !== "captured") return false;
    const days = (Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "captured": return "default";
      case "cancelled": return "destructive";
      case "refunded": return "secondary";
      default: return "outline";
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const activeSub = subscriptions.find(s => s.status === "active");

  return (
    <div className="space-y-6">
      {/* Active Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" /> Active Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeSub ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{activeSub.plan_name}</p>
                {activeSub.expires_at && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Expires: {new Date(activeSub.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={actionLoading === activeSub.id}>
                    {actionLoading === activeSub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel Subscription"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your plan will be downgraded to Free immediately. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleCancel(activeSub.id)}>Confirm Cancel</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription — you're on the Free plan.</p>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Payment History</CardTitle>
            <CardDescription>Your recent transactions</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData} disabled={fetching}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No payments yet.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">₹{p.amount_inr}</TableCell>
                      <TableCell><Badge variant={statusColor(p.status)}>{p.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{p.razorpay_order_id?.slice(0, 16)}...</TableCell>
                      <TableCell className="text-right">
                        {isRefundable(p) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={actionLoading === p.id}>
                                {actionLoading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                                  <><AlertTriangle className="w-3 h-3 mr-1" /> Refund</>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Request Refund?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ₹{p.amount_inr} will be refunded. Your subscription and credits will be adjusted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRefund(p.id)}>Confirm Refund</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;
