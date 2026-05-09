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
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';
import { downloadFile } from '../utils/download';

const API_URL = 'http://localhost:3001/api';

function ReportsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [clientBilling, setClientBilling] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 0) {
        const res = await axios.get(`${API_URL}/reports/client-wise-billing`, { headers });
        setClientBilling(res.data);
      } else if (activeTab === 1) {
        const res = await axios.get(`${API_URL}/reports/outstanding-receivables`, { headers });
        setReceivables(res.data);
      } else if (activeTab === 2) {
        const res = await axios.get(`${API_URL}/reports/monthly-revenue`, { headers });
        setMonthlyRevenue(res.data);
      } else if (activeTab === 3) {
        const res = await axios.get(`${API_URL}/reports/staff-performance`, { headers });
        setStaffPerformance(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const handleExport = async (reportType) => {
    try {
      const map = {
        'Client Billing': { url: 'client-wise-billing/excel', file: 'client-wise-billing.xlsx' },
        'Outstanding Receivables': { url: 'outstanding-receivables/excel', file: 'outstanding-receivables.xlsx' },
        'Monthly Revenue': { url: 'monthly-revenue/excel', file: 'monthly-revenue.xlsx' },
        'Staff Performance': { url: 'staff-performance/excel', file: 'staff-performance.xlsx' },
      };
      const cfg = map[reportType];
      if (!cfg) return;
      await downloadFile(`${API_URL}/reports/${cfg.url}`, cfg.file);
    } catch (err) {
      setError('Failed to download report');
    }
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <h1 style={{ margin: 0 }}>Reports</h1>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
            <Tab label="Client-wise Billing" />
            <Tab label="Outstanding Receivables" />
            <Tab label="Monthly Revenue" />
          </Tabs>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              {activeTab === 0 && (
                <>
                  <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleExport('Client Billing')}
                    >
                      Export to Excel
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Client Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>PAN</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Invoices</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Paid</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Outstanding</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Billed</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {clientBilling.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                              No data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          clientBilling.map((row, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell>{row.client_name}</TableCell>
                              <TableCell>{row.pan}</TableCell>
                              <TableCell align="center">{row.invoice_count}</TableCell>
                              <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                {formatCurrency(row.paid_amount)}
                              </TableCell>
                              <TableCell align="right" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                                {formatCurrency(row.outstanding_amount)}
                              </TableCell>
                              <TableCell align="right">{formatCurrency(row.total_billed)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {activeTab === 1 && (
                <>
                  <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleExport('Outstanding Receivables')}
                    >
                      Export to Excel
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Invoice #</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Amount</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Paid</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Outstanding</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {receivables.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                              No outstanding receivables
                            </TableCell>
                          </TableRow>
                        ) : (
                          receivables.map((row, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 'bold' }}>{row.invoice_number}</TableCell>
                              <TableCell>{row.client_name}</TableCell>
                              <TableCell align="right">{formatCurrency(row.total_amount)}</TableCell>
                              <TableCell align="right" sx={{ color: '#4caf50' }}>
                                {formatCurrency(row.paid_amount)}
                              </TableCell>
                              <TableCell align="right" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                                {formatCurrency(row.outstanding_amount)}
                              </TableCell>
                              <TableCell>{formatDate(row.due_date)}</TableCell>
                              <TableCell>{row.payment_status}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {activeTab === 2 && (
                <>
                  <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleExport('Monthly Revenue')}
                    >
                      Export to Excel
                    </Button>
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {monthlyRevenue.length > 0 && (
                      <>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card>
                            <CardContent>
                              <Typography color="textSecondary" gutterBottom>
                                Total Revenue (YTD)
                              </Typography>
                              <Typography variant="h5">
                                {formatCurrency(monthlyRevenue.reduce((sum, m) => sum + (m.total_billed || 0), 0))}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card>
                            <CardContent>
                              <Typography color="textSecondary" gutterBottom>
                                Total Collected (YTD)
                              </Typography>
                              <Typography variant="h5" sx={{ color: '#4caf50' }}>
                                {formatCurrency(monthlyRevenue.reduce((sum, m) => sum + (m.total_collected || 0), 0))}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </>
                    )}
                  </Grid>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Month</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Invoices</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Billed</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Collected</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Outstanding</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {monthlyRevenue.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                              No revenue data
                            </TableCell>
                          </TableRow>
                        ) : (
                          monthlyRevenue.map((row, idx) => {
                            const outstanding = (row.total_billed || 0) - (row.total_collected || 0);
                            return (
                              <TableRow key={idx} hover>
                                <TableCell sx={{ fontWeight: 'bold' }}>{row.month}</TableCell>
                                <TableCell align="center">{row.invoice_count}</TableCell>
                                <TableCell align="right">{formatCurrency(row.total_billed)}</TableCell>
                                <TableCell align="right" sx={{ color: '#4caf50' }}>
                                  {formatCurrency(row.total_collected)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: outstanding > 0 ? '#f44336' : '#4caf50' }}>
                                  {formatCurrency(outstanding)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </Layout>
  );
}

export default ReportsPage;
