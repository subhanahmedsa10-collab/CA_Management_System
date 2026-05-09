import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  AttachMoney as AttachMoneyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color }}>
              {value}
            </Typography>
          </Box>
          <Icon sx={{ fontSize: 40, color, opacity: 0.3 }} />
        </Box>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [metricsRes, tasksRes, invoicesRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/metrics`, { headers }),
        axios.get(`${API_URL}/dashboard/pending-tasks`, { headers }),
        axios.get(`${API_URL}/dashboard/overdue-invoices`, { headers }),
      ]);

      setMetrics(metricsRes.data);
      setPendingTasks(tasksRes.data);
      setOverdueInvoices(invoicesRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
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

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
          Dashboard
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Key Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Pending Tasks"
                  value={metrics?.pendingTasks || 0}
                  icon={AssignmentIcon}
                  color="#ff9800"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Clients"
                  value={metrics?.totalClients || 0}
                  icon={PeopleIcon}
                  color="#2196f3"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Outstanding Payments"
                  value={formatCurrency(metrics?.outstandingPayments || 0)}
                  icon={AttachMoneyIcon}
                  color="#f44336"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Monthly Revenue"
                  value={formatCurrency(metrics?.monthlyRevenue || 0)}
                  icon={AttachMoneyIcon}
                  color="#4caf50"
                />
              </Grid>
            </Grid>

            {/* Pending Tasks */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Pending Tasks
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell>Client</TableCell>
                          <TableCell>Task</TableCell>
                          <TableCell>Due Date</TableCell>
                          <TableCell>Priority</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pendingTasks.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              No pending tasks
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingTasks.map((task) => (
                            <TableRow key={task.id} hover>
                              <TableCell>{task.client_name}</TableCell>
                              <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {task.description}
                              </TableCell>
                              <TableCell>{formatDate(task.due_date)}</TableCell>
                              <TableCell>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.85em',
                                  fontWeight: 'bold',
                                  backgroundColor: task.priority === 'High' ? '#ffcdd2' : task.priority === 'Medium' ? '#fff3e0' : '#e8f5e9',
                                  color: task.priority === 'High' ? '#c62828' : task.priority === 'Medium' ? '#e65100' : '#2e7d32',
                                }}>
                                  {task.priority}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* Overdue Invoices */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon sx={{ color: '#f44336' }} />
                    Overdue Invoices
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell>Invoice #</TableCell>
                          <TableCell>Client</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Due Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {overdueInvoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              No overdue invoices
                            </TableCell>
                          </TableRow>
                        ) : (
                          overdueInvoices.map((invoice) => (
                            <TableRow key={invoice.id} hover sx={{ bgcolor: '#ffebee' }}>
                              <TableCell sx={{ fontWeight: 'bold' }}>{invoice.invoice_number}</TableCell>
                              <TableCell>{invoice.client_name}</TableCell>
                              <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                              <TableCell sx={{ color: '#f44336', fontWeight: 'bold' }}>
                                {formatDate(invoice.due_date)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </Layout>
  );
}

export default DashboardPage;
