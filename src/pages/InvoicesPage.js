import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Payments as PaymentsIcon,
  Visibility as VisibilityIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';
import { downloadFile } from '../utils/download';

const API_URL = 'http://localhost:3001/api';

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [generateFormData, setGenerateFormData] = useState({
    client_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    gst_percentage: 18,
  });

  // Payment dialog state
  const [paymentDialog, setPaymentDialog] = useState({ open: false, invoice: null, payments: [] });
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'Bank Transfer',
    reference_number: '',
    notes: '',
  });

  // Edit invoice number dialog
  const [editInvoiceDialog, setEditInvoiceDialog] = useState({ open: false, invoice: null });
  const [editInvoiceForm, setEditInvoiceForm] = useState({ invoice_number: '', invoice_date: '', due_date: '' });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [invoicesRes, clientsRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/invoices`, {
          params: { status: statusFilter || undefined },
          headers,
        }),
        axios.get(`${API_URL}/clients?limit=1000`, { headers }),
        axios.get(`${API_URL}/tasks?status=Completed`, { headers }),
      ]);

      setInvoices(invoicesRes.data.invoices);
      setClients(clientsRes.data.clients);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (selectedTasks.length === 0) {
      setError('Please select at least one task');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/invoices/generate`,
        {
          ...generateFormData,
          task_ids: selectedTasks,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOpenGenerateDialog(false);
      setSelectedTasks([]);
      setError('');
      fetchData();
      alert('Invoice generated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate invoice');
    }
  };

  const handleOpenPaymentDialog = async (invoice) => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/invoices/${invoice.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const totalPaid = (res.data.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      const remaining = Number(invoice.total_amount || 0) - totalPaid;
      setPaymentDialog({ open: true, invoice, payments: res.data.payments || [], totalPaid, remaining });
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        amount: remaining > 0 ? remaining.toFixed(2) : '',
        payment_method: 'Bank Transfer',
        reference_number: '',
        notes: '',
      });
    } catch (err) {
      setError('Failed to load invoice details');
    }
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialog({ open: false, invoice: null, payments: [] });
  };

  const handleRecordPayment = async () => {
    setError('');
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (Number(paymentForm.amount) > Number(paymentDialog.remaining || 0) + 0.01) {
      if (!window.confirm(`Amount entered (₹${paymentForm.amount}) is more than remaining (₹${Number(paymentDialog.remaining).toFixed(2)}). Continue anyway?`)) {
        return;
      }
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/payments`,
        {
          invoice_id: paymentDialog.invoice.id,
          payment_date: paymentForm.payment_date,
          amount: Number(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number || '',
          notes: paymentForm.notes || '',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      handleClosePaymentDialog();
      setError('');
      fetchData();
    } catch (err) {
      console.error('Payment error:', err.response?.data, err.message);
      setError(`Payment failed: ${err.response?.data?.error || err.message || 'Unknown error'}`);
    }
  };

  const handleOpenEditInvoice = (invoice) => {
    setEditInvoiceForm({
      invoice_number: invoice.invoice_number || '',
      invoice_date: invoice.invoice_date || '',
      due_date: invoice.due_date || '',
    });
    setEditInvoiceDialog({ open: true, invoice });
  };

  const handleSaveEditInvoice = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/invoices/${editInvoiceDialog.invoice.id}`,
        editInvoiceForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditInvoiceDialog({ open: false, invoice: null });
      setError('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update invoice');
    }
  };

  const handleWhatsAppReminder = (invoice) => {
    const phone = invoice.client_phone;
    if (!phone) {
      alert('Client ka phone number nahi hai. Pehle Clients page mein phone number add karo.');
      return;
    }
    // Strip non-digits and ensure 91 prefix for India numbers
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = '91' + cleaned;

    const totalPaid = 0; // Reminder uses invoice total; actual paid shown via dialog already
    const remaining = Number(invoice.total_amount || 0);
    const message =
`Dear ${invoice.client_name},

This is a gentle reminder for invoice *${invoice.invoice_number}* dated ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}.

Amount: Rs. ${remaining.toFixed(2)}
Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '-'}
Status: ${invoice.payment_status}

Kindly arrange the payment at your earliest convenience.

Thank you.`;

    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleMarkFullyPaid = async (invoice) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/invoices/${invoice.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const totalPaid = (res.data.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      const remaining = Number(invoice.total_amount || 0) - totalPaid;
      if (remaining <= 0) {
        setError('Invoice is already fully paid');
        return;
      }
      if (!window.confirm(`Mark invoice ${invoice.invoice_number} as fully paid?\nAmount: ₹${remaining.toFixed(2)}`)) return;
      await axios.post(
        `${API_URL}/payments`,
        {
          invoice_id: invoice.id,
          payment_date: new Date().toISOString().split('T')[0],
          amount: remaining,
          payment_method: 'Bank Transfer',
          reference_number: '',
          notes: 'Marked fully paid via quick action',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as paid');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Paid': 'success',
      'Partially Paid': 'warning',
      'Unpaid': 'error',
      'Overdue': 'error',
    };
    return colors[status] || 'default';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const summary = (() => {
    let total = 0, paid = 0, outstanding = 0, overdueAmt = 0, overdueCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    invoices.forEach(inv => {
      const amt = Number(inv.total_amount || 0);
      total += amt;
      if (inv.payment_status === 'Paid') {
        paid += amt;
      } else {
        outstanding += amt;
        if (inv.due_date && inv.due_date < todayStr) {
          overdueAmt += amt;
          overdueCount += 1;
        }
      }
    });
    return { total, paid, outstanding, overdueAmt, overdueCount, totalCount: invoices.length };
  })();

  const getAvailableTasks = () => {
    return tasks.filter(t => {
      const client = clients.find(c => c.id === generateFormData.client_id);
      return t.status === 'Completed' && t.client_id === parseInt(generateFormData.client_id);
    });
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <h1 style={{ margin: 0 }}>Invoices</h1>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={async () => {
              setSelectedTasks([]);
              let suggested = '';
              try {
                const token = localStorage.getItem('token');
                const r = await axios.get(`${API_URL}/invoices/next-number`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                suggested = r.data.suggested || '';
              } catch (e) { /* ignore, leave blank */ }
              setGenerateFormData({
                client_id: '',
                invoice_number: suggested,
                invoice_date: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                gst_percentage: 18,
              });
              setOpenGenerateDialog(true);
            }}
          >
            Generate Invoice
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #1976d2' }}>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Total Invoices</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{summary.totalCount}</Typography>
                <Typography variant="caption" color="textSecondary">{formatCurrency(summary.total)} billed</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #4caf50' }}>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Paid</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  {formatCurrency(summary.paid)}
                </Typography>
                <Typography variant="caption" color="textSecondary">Collected</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #ff9800' }}>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Outstanding (Pending)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                  {formatCurrency(summary.outstanding)}
                </Typography>
                <Typography variant="caption" color="textSecondary">Yet to receive</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #f44336' }}>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Overdue</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                  {formatCurrency(summary.overdueAmt)}
                </Typography>
                <Typography variant="caption" color="textSecondary">{summary.overdueCount} invoice(s) past due</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper>
          <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              variant="outlined"
              SelectProps={{ native: true }}
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
            </TextField>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map(invoice => (
                      <TableRow key={invoice.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.client_name}</TableCell>
                        <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                        <TableCell>{formatDate(invoice.due_date)}</TableCell>
                        <TableCell align="right">{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.payment_status}
                            color={getStatusColor(invoice.payment_status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {invoice.payment_status !== 'Paid' && (
                            <>
                              <IconButton
                                size="small"
                                title="Mark Fully Paid"
                                onClick={() => handleMarkFullyPaid(invoice)}
                                sx={{ color: '#4caf50' }}
                              >
                                <PaymentsIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                title="Record Partial Payment"
                                onClick={() => handleOpenPaymentDialog(invoice)}
                                sx={{ color: '#ff9800' }}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                          <IconButton
                            size="small"
                            title="View Payments"
                            onClick={() => handleOpenPaymentDialog(invoice)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          {invoice.payment_status !== 'Paid' && (
                            <IconButton
                              size="small"
                              title="Send WhatsApp Reminder"
                              onClick={() => handleWhatsAppReminder(invoice)}
                              sx={{ color: '#25D366' }}
                            >
                              <WhatsAppIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            title="Edit Invoice (number, dates)"
                            onClick={() => handleOpenEditInvoice(invoice)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            title="Download PDF"
                            onClick={async () => {
                              try {
                                await downloadFile(
                                  `${API_URL}/invoices/${invoice.id}/pdf`,
                                  `${invoice.invoice_number}.pdf`
                                );
                              } catch (err) {
                                setError('Failed to download invoice PDF');
                              }
                            }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Generate Invoice Dialog */}
        <Dialog open={openGenerateDialog} onClose={() => setOpenGenerateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client"
                  value={generateFormData.client_id}
                  onChange={(e) => {
                    setGenerateFormData(prev => ({ ...prev, client_id: e.target.value }));
                    setSelectedTasks([]);
                  }}
                  select
                  SelectProps={{ native: true }}
                  required
                >
                  <option value="">Select Client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.client_name}</option>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  value={generateFormData.invoice_number}
                  onChange={(e) => setGenerateFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  helperText="Auto-suggested. Aap apni series ke hisab se edit kar sakte ho (e.g. ACME/24-25/001)"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {generateFormData.client_id && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Select Completed Tasks"
                    select
                    SelectProps={{
                      native: true,
                      multiple: true,
                    }}
                    value={selectedTasks}
                    onChange={(e) => setSelectedTasks(Array.from(e.target.selectedOptions, option => parseInt(option.value)))}
                  >
                    {getAvailableTasks().map(t => (
                      <option key={t.id} value={t.id}>
                        {t.description} - ₹{Number(t.proposed_fee || 0).toFixed(2)}
                      </option>
                    ))}
                  </TextField>
                </Grid>
              )}

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Invoice Date"
                  type="date"
                  value={generateFormData.invoice_date}
                  onChange={(e) => setGenerateFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  type="date"
                  value={generateFormData.due_date}
                  onChange={(e) => setGenerateFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="GST %"
                  type="number"
                  value={generateFormData.gst_percentage}
                  onChange={(e) => setGenerateFormData(prev => ({ ...prev, gst_percentage: parseFloat(e.target.value) }))}
                />
              </Grid>
            </Grid>

            {selectedTasks.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Summary:</strong><br/>
                  Subtotal: {formatCurrency(getAvailableTasks().filter(t => selectedTasks.includes(t.id)).reduce((sum, t) => sum + Number(t.proposed_fee || 0), 0))}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenGenerateDialog(false)}>Cancel</Button>
            <Button onClick={handleGenerateInvoice} variant="contained" disabled={selectedTasks.length === 0}>
              Generate
            </Button>
          </DialogActions>
        </Dialog>

        {/* Record Payment Dialog */}
        <Dialog open={paymentDialog.open} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            Record Payment
            {paymentDialog.invoice && (
              <Typography variant="body2" color="textSecondary">
                Invoice: {paymentDialog.invoice.invoice_number} ({paymentDialog.invoice.client_name})
              </Typography>
            )}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {paymentDialog.invoice && (
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">Total</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(paymentDialog.invoice.total_amount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">Paid So Far</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                      {formatCurrency(paymentDialog.totalPaid || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">Remaining</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                      {formatCurrency(paymentDialog.remaining || 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {paymentDialog.payments && paymentDialog.payments.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Payment History:</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Reference</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentDialog.payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.payment_date)}</TableCell>
                        <TableCell>{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{p.payment_method}</TableCell>
                        <TableCell>{p.reference_number || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {paymentDialog.remaining > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Add New Payment:</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Payment Date"
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Amount (₹)"
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      inputProps={{ step: '0.01', min: '0' }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Payment Method"
                      select
                      SelectProps={{ native: true }}
                      InputLabelProps={{ shrink: true }}
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Online">Online (UPI/IMPS/NEFT)</option>
                      <option value="Other">Other</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Reference No"
                      value={paymentForm.reference_number}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                      placeholder="Cheque/Txn ID"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notes"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            {paymentDialog.remaining <= 0 && (
              <Alert severity="success">
                This invoice is fully paid. No further payment needed.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog}>Close</Button>
            {paymentDialog.remaining > 0 && (
              <Button onClick={handleRecordPayment} variant="contained" color="success">
                Record Payment
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Edit Invoice Dialog */}
        <Dialog open={editInvoiceDialog.open} onClose={() => setEditInvoiceDialog({ open: false, invoice: null })} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  value={editInvoiceForm.invoice_number}
                  onChange={(e) => setEditInvoiceForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                  helperText="Apne format mein change kar sakte ho. Must be unique."
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Invoice Date"
                  type="date"
                  value={editInvoiceForm.invoice_date}
                  onChange={(e) => setEditInvoiceForm(prev => ({ ...prev, invoice_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  type="date"
                  value={editInvoiceForm.due_date}
                  onChange={(e) => setEditInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditInvoiceDialog({ open: false, invoice: null })}>Cancel</Button>
            <Button onClick={handleSaveEditInvoice} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}

export default InvoicesPage;
