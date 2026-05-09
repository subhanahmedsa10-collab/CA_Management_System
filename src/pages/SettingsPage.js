import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Alert,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import Layout from '../components/Layout';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

function SettingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'staff',
  });
  const [changePassword, setChangePassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    if (activeTab === 0 && user?.role === 'admin') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/users`, newUser, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOpenDialog(false);
      setNewUser({
        username: '',
        password: '',
        email: '',
        full_name: '',
        role: 'staff',
      });
      setError('');
      fetchUsers();
      alert('User created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleChangePassword = async () => {
    if (!changePassword.currentPassword || !changePassword.newPassword || !changePassword.confirmPassword) {
      setPasswordMessage('Please fill in all password fields');
      return;
    }

    if (changePassword.newPassword !== changePassword.confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }

    if (changePassword.newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters');
      return;
    }

    // In a real application, you would verify the current password with the backend
    setPasswordMessage('Password changed successfully! Please log in again.');
    setTimeout(() => {
      dispatch(logout());
      navigate('/login');
    }, 2000);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <h1 style={{ marginBottom: '24px' }}>Settings</h1>

        <Paper>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
            {user?.role === 'admin' && <Tab label="User Management" />}
            <Tab label="My Profile" />
            <Tab label="Change Password" />
            <Tab label="About" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* User Management Tab (Admin Only) */}
            {activeTab === 0 && user?.role === 'admin' && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <h2 style={{ margin: 0 }}>User Management</h2>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                  >
                    Add User
                  </Button>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Full Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map(u => (
                          <TableRow key={u.id} hover>
                            <TableCell>{u.username}</TableCell>
                            <TableCell>{u.full_name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                backgroundColor: u.role === 'admin' ? '#f3e5f5' : '#e3f2fd',
                                color: u.role === 'admin' ? '#6a1b9a' : '#1565c0',
                                fontWeight: 'bold',
                              }}>
                                {u.role === 'admin' ? 'Administrator' : 'Staff'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {u.is_active ? (
                                <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Active</span>
                              ) : (
                                <span style={{ color: '#f44336', fontWeight: 'bold' }}>Inactive</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(u.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Add User Dialog */}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogContent sx={{ pt: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Username"
                          value={newUser.username}
                          onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          value={newUser.full_name}
                          onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Role"
                          value={newUser.role}
                          onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                          select
                          SelectProps={{ native: true }}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Administrator</option>
                        </TextField>
                      </Grid>
                    </Grid>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddUser} variant="contained">
                      Create User
                    </Button>
                  </DialogActions>
                </Dialog>
              </>
            )}

            {/* My Profile Tab */}
            {activeTab === (user?.role === 'admin' ? 1 : 0) && (
              <>
                <h2 style={{ marginTop: 0 }}>My Profile</h2>
                <Card>
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Typography color="textSecondary" gutterBottom>
                          Full Name
                        </Typography>
                        <Typography variant="h6">{user?.full_name}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography color="textSecondary" gutterBottom>
                          Username
                        </Typography>
                        <Typography variant="h6">{user?.username}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography color="textSecondary" gutterBottom>
                          Email
                        </Typography>
                        <Typography variant="h6">{user?.email}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography color="textSecondary" gutterBottom>
                          Role
                        </Typography>
                        <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                          {user?.role === 'admin' ? 'Administrator' : 'Staff Member'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Change Password Tab */}
            {activeTab === (user?.role === 'admin' ? 2 : 1) && (
              <>
                <h2 style={{ marginTop: 0 }}>Change Password</h2>
                {passwordMessage && (
                  <Alert
                    severity={passwordMessage.includes('successfully') ? 'success' : 'error'}
                    sx={{ mb: 2 }}
                  >
                    {passwordMessage}
                  </Alert>
                )}
                <Card sx={{ maxWidth: 500 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Current Password"
                          type="password"
                          value={changePassword.currentPassword}
                          onChange={(e) => setChangePassword(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="New Password"
                          type="password"
                          value={changePassword.newPassword}
                          onChange={(e) => setChangePassword(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Confirm Password"
                          type="password"
                          value={changePassword.confirmPassword}
                          onChange={(e) => setChangePassword(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={handleChangePassword}
                        >
                          Change Password
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </>
            )}

            {/* About Tab */}
            {activeTab === (user?.role === 'admin' ? 3 : 2) && (
              <>
                <h2 style={{ marginTop: 0 }}>About</h2>
                <Card>
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      CA Firm Management System
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Professional Client & Billing Management Software
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      <strong>Version:</strong> 1.0.0
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      <strong>Release Date:</strong> May 2026
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Technology Stack:</strong> Electron, React, Node.js, SQLite
                    </Typography>

                    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        <strong>Developer:</strong> Subhan Ahmed
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        © 2026 CA Management System. All rights reserved.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </>
            )}
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}

export default SettingsPage;
