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
  TablePagination,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  FileUpload as UploadIcon,
  Description as TemplateIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';
import { downloadFile } from '../utils/download';

const API_URL = 'http://localhost:3001/api';

const initialFormState = {
  client_name: '',
  firm_name: '',
  gstin: '',
  pan: '',
  contact_number: '',
  email: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  service_type: '',
  notes: '',
};

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchClients();
  }, [page, rowsPerPage, search]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/clients`, {
        params: { page: page + 1, limit: rowsPerPage, search },
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data.clients);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (client = null) => {
    if (client) {
      setEditingId(client.id);
      setFormData(client);
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (editingId) {
        await axios.put(`${API_URL}/clients/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_URL}/clients`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      handleCloseDialog();
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save client');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/clients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchClients();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete client');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <h1 style={{ margin: 0 }}>Clients</h1>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<TemplateIcon />}
              onClick={async () => {
                try {
                  await downloadFile(`${API_URL}/clients/import/template`, 'clients-import-template.xlsx');
                } catch (e) { setError('Failed to download template'); }
              }}
            >
              Template
            </Button>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    const token = localStorage.getItem('token');
                    const res = await axios.post(`${API_URL}/clients/import/excel`, fd, {
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                    });
                    let msg = `Imported: ${res.data.inserted}, Skipped: ${res.data.skipped}`;
                    if (res.data.errors && res.data.errors.length) {
                      msg += `\n\nIssues:\n` + res.data.errors.slice(0, 10).join('\n');
                      if (res.data.errors.length > 10) msg += `\n... and ${res.data.errors.length - 10} more`;
                    }
                    alert(msg);
                    fetchClients();
                  } catch (err) {
                    setError(err.response?.data?.error || 'Import failed');
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={async () => {
                try {
                  await downloadFile(`${API_URL}/clients/export/excel`, 'clients-master.xlsx');
                } catch (e) { setError('Failed to export'); }
              }}
            >
              Export Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Client
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper>
          <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search by name, PAN, GSTIN, or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              size="small"
              variant="outlined"
              fullWidth
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Client Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Firm</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>PAN</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>GSTIN</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Service Type</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          No clients found
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.map(client => (
                        <TableRow key={client.id} hover>
                          <TableCell sx={{ fontWeight: 'bold' }}>{client.client_name}</TableCell>
                          <TableCell>{client.firm_name}</TableCell>
                          <TableCell>{client.pan}</TableCell>
                          <TableCell>{client.gstin}</TableCell>
                          <TableCell>{client.contact_number}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.service_type}</TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(client)}
                              title="Edit"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(client.id)}
                              title="Delete"
                            >
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={clients.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
              />
            </>
          )}
        </Paper>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingId ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client Name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Firm Name"
                  name="firm_name"
                  value={formData.firm_name}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="PAN"
                  name="pan"
                  value={formData.pan}
                  onChange={handleInputChange}
                  placeholder="AAAAAAA0000A"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="GSTIN"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contact Number"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Service Type"
                  name="service_type"
                  value={formData.service_type}
                  onChange={handleInputChange}
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="">Select</option>
                  <option value="Tax Compliance">Tax Compliance</option>
                  <option value="Audit">Audit</option>
                  <option value="Bookkeeping">Bookkeeping</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Consultation">Consultation</option>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}

export default ClientsPage;
