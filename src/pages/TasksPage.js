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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const initialFormState = {
  client_id: '',
  description: '',
  assigned_to: '',
  status: 'Pending',
  priority: 'Medium',
  assigned_date: new Date().toISOString().split('T')[0],
  due_date: '',
  completion_date: '',
  proposed_fee: '',
  notes: '',
};

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [tasksRes, clientsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/tasks`, {
          params: { status: statusFilter || undefined },
          headers,
        }),
        axios.get(`${API_URL}/clients?limit=1000`, { headers }),
        axios.get(`${API_URL}/users`, { headers }),
      ]);

      setTasks(tasksRes.data.tasks);
      setClients(clientsRes.data.clients);
      setUsers(usersRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingId(task.id);
      setFormData({
        client_id: task.client_id,
        description: task.description,
        assigned_to: task.assigned_to || '',
        status: task.status || 'Pending',
        priority: task.priority,
        assigned_date: task.assigned_date,
        due_date: task.due_date,
        completion_date: task.completion_date || '',
        proposed_fee: task.proposed_fee,
        notes: task.notes,
      });
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
      const payload = { ...formData };
      if (payload.status === 'Completed' && !payload.completion_date) {
        payload.completion_date = new Date().toISOString().split('T')[0];
      }
      if (editingId) {
        await axios.put(`${API_URL}/tasks/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_URL}/tasks`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      handleCloseDialog();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/tasks/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchData();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete task');
      }
    }
  };

  const handleQuickStatusChange = async (task, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        description: task.description,
        assigned_to: task.assigned_to,
        status: newStatus,
        priority: task.priority,
        assigned_date: task.assigned_date,
        due_date: task.due_date,
        completion_date: newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : task.completion_date,
        proposed_fee: task.proposed_fee,
        notes: task.notes,
      };
      await axios.put(`${API_URL}/tasks/${task.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'warning',
      'In Progress': 'info',
      'Completed': 'success',
      'Billed': 'default',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'High': 'error',
      'Medium': 'warning',
      'Low': 'success',
    };
    return colors[priority] || 'default';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <h1 style={{ margin: 0 }}>Tasks</h1>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Task
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper>
          <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              select
              label="Filter by Client"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              size="small"
              variant="outlined"
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.client_name}</option>
              ))}
            </TextField>
            <TextField
              select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              variant="outlined"
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Billed">Billed</option>
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
                    <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Fee</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.filter(task => !clientFilter || String(task.client_id) === String(clientFilter)).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        No tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tasks
                      .filter(task => !clientFilter || String(task.client_id) === String(clientFilter))
                      .map(task => {
                        const taskStatus = task.status || 'Pending';
                        const taskPriority = task.priority || 'Medium';
                        return (
                          <TableRow key={task.id} hover>
                        <TableCell>{task.client_name}</TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.description}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={taskStatus}
                            color={getStatusColor(taskStatus)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={taskPriority}
                            color={getPriorityColor(taskPriority)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{formatDate(task.due_date)}</TableCell>
                        <TableCell>₹{Number(task.proposed_fee || 0).toFixed(2)}</TableCell>
                        <TableCell align="center">
                          {taskStatus === 'Pending' && (
                            <IconButton
                              size="small"
                              onClick={() => handleQuickStatusChange(task, 'In Progress')}
                              title="Start Task"
                              sx={{ color: '#2196f3' }}
                            >
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          )}
                          {(taskStatus === 'Pending' || taskStatus === 'In Progress') && (
                            <IconButton
                              size="small"
                              onClick={() => handleQuickStatusChange(task, 'Completed')}
                              title="Mark as Completed"
                              sx={{ color: '#4caf50' }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(task)}
                            title="Edit"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(task.id)}
                            title="Delete"
                          >
                            <DeleteIcon fontSize="small" color="error" />
                          </IconButton>
                        </TableCell>
                        </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingId ? 'Edit Task' : 'Add New Task'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleInputChange}
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
                  label="Task Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Assigned To"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleInputChange}
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Completion Date"
                  name="completion_date"
                  type="date"
                  value={formData.completion_date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  helperText={formData.status === 'Completed' ? 'Auto-filled today if empty' : ''}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Proposed Fee"
                  name="proposed_fee"
                  type="number"
                  value={formData.proposed_fee}
                  onChange={handleInputChange}
                  inputProps={{ step: '0.01' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  multiline
                  rows={2}
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

export default TasksPage;
