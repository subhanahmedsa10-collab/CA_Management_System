import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const emptyProfile = {
  firm_name: '',
  proprietor_name: '',
  membership_no: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  phone: '',
  email: '',
  website: '',
  gstin: '',
  pan: '',
  bank_name: '',
  bank_account: '',
  bank_ifsc: '',
  bank_branch: '',
  invoice_prefix: 'INV',
  invoice_footer: '',
  default_gst_percentage: 18,
};

function FirmProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/firm-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile({ ...emptyProfile, ...res.data });
    } catch (err) {
      setError('Failed to load firm profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/firm-profile`, profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Firm profile saved. New invoices will use these details.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <h1 style={{ margin: 0 }}>Firm Profile</h1>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Yeh details aapki invoices ke header aur footer mein print hongi.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>Firm Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Firm Name *" name="firm_name" value={profile.firm_name} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Proprietor / Partner Name" name="proprietor_name" value={profile.proprietor_name} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="ICAI Membership No" name="membership_no" value={profile.membership_no} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Website" name="website" value={profile.website} onChange={handleChange} />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>Address</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" name="address" value={profile.address} onChange={handleChange} multiline rows={2} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="City" name="city" value={profile.city} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="State" name="state" value={profile.state} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Postal Code" name="postal_code" value={profile.postal_code} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" name="phone" value={profile.phone} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" name="email" type="email" value={profile.email} onChange={handleChange} />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>Tax Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="GSTIN" name="gstin" value={profile.gstin} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="PAN" name="pan" value={profile.pan} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Default GST %" name="default_gst_percentage" type="number" value={profile.default_gst_percentage} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Invoice Prefix" name="invoice_prefix" value={profile.invoice_prefix} onChange={handleChange} helperText="e.g. INV, BIL" />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>Bank Details (for invoice payments)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Bank Name" name="bank_name" value={profile.bank_name} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Account Number" name="bank_account" value={profile.bank_account} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="IFSC Code" name="bank_ifsc" value={profile.bank_ifsc} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Branch" name="bank_branch" value={profile.bank_branch} onChange={handleChange} />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>Invoice Footer</Typography>
          <TextField
            fullWidth
            label="Footer text on invoice"
            name="invoice_footer"
            value={profile.invoice_footer}
            onChange={handleChange}
            multiline
            rows={2}
            helperText='e.g. "This is a system-generated invoice. For queries contact us at..."'
          />
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Firm Profile'}
          </Button>
        </Box>
      </Container>
    </Layout>
  );
}

export default FirmProfilePage;
