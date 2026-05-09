import axios from 'axios';

export async function downloadFile(url, filename) {
  const token = localStorage.getItem('token');
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
  });

  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream',
  });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}
