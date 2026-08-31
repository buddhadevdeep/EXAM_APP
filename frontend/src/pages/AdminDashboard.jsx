import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { FaUsers, FaFolderOpen, FaGraduationCap, FaDownload, FaSyncAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const AdminDashboard = () => {
  const { cachedAdminStats, setCachedAdminStats } = useAuth();
  const [data, setData] = useState(cachedAdminStats || null);
  const [loading, setLoading] = useState(!cachedAdminStats);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/analytics`);
      setData(res.data);
      setCachedAdminStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !data) {
    return (
      <div className="container mt-4">
        <div className="skeleton-line" style={{ height: '40px', width: '200px' }}></div>
        <div className="row mt-4">
          <div className="col-md-3 mb-3"><div className="skeleton-line" style={{ height: '120px' }}></div></div>
          <div className="col-md-3 mb-3"><div className="skeleton-line" style={{ height: '120px' }}></div></div>
          <div className="col-md-3 mb-3"><div className="skeleton-line" style={{ height: '120px' }}></div></div>
          <div className="col-md-3 mb-3"><div className="skeleton-line" style={{ height: '120px' }}></div></div>
        </div>
      </div>
    );
  }

  const { metrics, activityLogs } = data;

  const barData = {
    labels: ['Total Users', 'Total Exams', 'Submissions', 'Graded'],
    datasets: [{
      label: 'Count',
      data: [metrics.totalUsers, metrics.totalExams, metrics.totalSubmissions, metrics.gradedSubmissions],
      backgroundColor: ['#0d6efd', '#0dcaf0', '#198754', '#ffc107']
    }]
  };

  const pieData = {
    labels: ['Graded Submissions', 'Pending Grading'],
    datasets: [{
      data: [metrics.gradedSubmissions, Math.max(0, metrics.totalSubmissions - metrics.gradedSubmissions)],
      backgroundColor: ['#198754', '#dc3545']
    }]
  };

  return (
    <div className="container mt-4 animated-fade">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <h3 className="fw-bold mb-0">Platform Admin Analytics</h3>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-outline-primary" onClick={fetchStats}><FaSyncAlt /> Sync</button>
          <a href={`${API_BASE}/api/admin/reports/pdf?token=${localStorage.getItem('token')}`} className="btn btn-primary"><FaDownload /> PDF</a>
          <a href={`${API_BASE}/api/admin/reports/excel?token=${localStorage.getItem('token')}`} className="btn btn-success"><FaDownload /> Excel</a>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card glass-card p-3 d-flex flex-row align-items-center justify-content-between">
            <div>
              <h6 className="text-muted">Total Accounts</h6>
              <h3>{metrics.totalUsers}</h3>
            </div>
            <FaUsers className="fs-1 text-primary" />
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card glass-card p-3 d-flex flex-row align-items-center justify-content-between">
            <div>
              <h6 className="text-muted">Active Exams</h6>
              <h3>{metrics.totalExams}</h3>
            </div>
            <FaFolderOpen className="fs-1 text-info" />
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card glass-card p-3 d-flex flex-row align-items-center justify-content-between">
            <div>
              <h6 className="text-muted">Submissions</h6>
              <h3>{metrics.totalSubmissions}</h3>
            </div>
            <FaGraduationCap className="fs-1 text-success" />
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card glass-card p-3 d-flex flex-row align-items-center justify-content-between">
            <div>
              <h6 className="text-muted">Graded Tasks</h6>
              <h3>{metrics.gradedSubmissions}</h3>
            </div>
            <FaGraduationCap className="fs-1 text-warning" />
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-7 mb-3">
          <div className="card glass-card p-4">
            <h5 className="card-title fw-bold mb-3">System Overview</h5>
            <Bar data={barData} options={{ responsive: true }} />
          </div>
        </div>
        <div className="col-md-5 mb-3">
          <div className="card glass-card p-4">
            <h5 className="card-title fw-bold mb-3">Grading Ratio</h5>
            <div className="mx-auto" style={{ maxWidth: '280px' }}>
              <Pie data={pieData} />
            </div>
          </div>
        </div>
      </div>

      <div className="card glass-card p-4">
        <h5 className="card-title fw-bold mb-3">Recent Security & Activity Logs</h5>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.email || 'System'}</td>
                  <td><span className="badge bg-secondary">{log.action}</span></td>
                  <td>{log.details}</td>
                  <td>{log.ip_address || 'N/A'}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


