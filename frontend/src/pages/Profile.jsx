import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // FIX: Import as a variable
import { 
  FaUserAstronaut, 
  FaTrashAlt, 
  FaChartLine, 
  FaHistory, 
  FaTrophy, 
  FaFilter,
  FaBrain,
  FaDownload 
} from 'react-icons/fa';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../css/Profile.css';

import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

Modal.setAppElement('#root');

export default function Profile() {
  const [profileData, setProfileData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  
  const [timeFilter, setTimeFilter] = useState('latest');
  const [genreFilter, setGenreFilter] = useState('all');

  const [stats, setStats] = useState({ total: 0, avgScore: 0, topTopic: 'N/A' });
  
  const user = JSON.parse(localStorage.getItem('user'));

  const genres = [
    'Web development',
    'Data structures and algorithms',
    'Computer Networks',
    'Object Oriented Programming',
    'Operating systems',
    'Database Management system'
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // --- Graph Data Preparation ---
  const chartData = useMemo(() => {
    return [...profileData].reverse().map((item, index) => ({
      name: `Q ${index + 1}`,
      date: formatDate(item.submit_time),
      score: item.rating,
      topic: item.genre_name
    }));
  }, [profileData]);

  // --- Stats Calculation ---
  const calculateStats = (data) => {
    if (!data.length) {
        setStats({ total: 0, avgScore: 0, topTopic: 'N/A' });
        return;
    }
    
    // Logic: 1 Interview = 5 Questions
    const totalInterviews = Math.ceil(data.length / 5);

    const totalScore = data.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    const avgScore = (totalScore / data.length).toFixed(1);

    const topicCounts = {};
    let maxCount = 0;
    let topTopic = 'N/A';
    data.forEach(item => {
      topicCounts[item.genre_name] = (topicCounts[item.genre_name] || 0) + 1;
      if (topicCounts[item.genre_name] > maxCount) {
        maxCount = topicCounts[item.genre_name];
        topTopic = item.genre_name;
      }
    });

    setStats({ total: totalInterviews, avgScore, topTopic });
  };

  // --- PDF GENERATION LOGIC ---
  const downloadReport = () => {
    if (filteredData.length === 0) {
      toast.error("No data to download!");
      return;
    }

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(`Performance Report: ${user?.username || 'User'}`, 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Questions Answered: ${filteredData.length}`, 14, 36);

    // Table Data
    const tableColumn = ["Date", "Topic", "Question", "Score", "AI Feedback"];
    const tableRows = [];

    filteredData.forEach(item => {
      const rowData = [
        formatDate(item.submit_time),
        item.genre_name,
        item.question,
        `${item.rating}/10`,
        item.feedback
      ];
      tableRows.push(rowData);
    });

    // FIX: Use autoTable(doc, options) instead of doc.autoTable()
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [217, 70, 239] }, // Neon Purple
    });

    doc.save(`techReady_Report_${new Date().getTime()}.pdf`);
    toast.success("Report downloaded successfully!");
  };

  const fetchProfile = async () => {
    try {
      if (user && user.email) {
        const url = `http://127.0.0.1:8000/my_app/api/profile/${user.email}`;
        const response = await axios.get(url);
        if (response.status === 200) {
          setProfileData(response.data);
          setFilteredData(response.data);
          calculateStats(response.data);
        }
      }
    } catch (error) {
      setError("Could not load profile data.");
    }
  };

  useEffect(() => {
    if (user && profileData.length === 0 && !error) {
      fetchProfile();
    }
  }, []);

  useEffect(() => {
    let filtered = [...profileData];
    if (timeFilter === 'earliest') {
      filtered.sort((a, b) => new Date(a.submit_time) - new Date(b.submit_time));
    } else {
      filtered.sort((a, b) => new Date(b.submit_time) - new Date(a.submit_time));
    }
    if (genreFilter !== 'all') {
      filtered = filtered.filter(report => report.genre_name === genreFilter);
    }
    setFilteredData(filtered);
  }, [timeFilter, genreFilter, profileData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'timeFilter') setTimeFilter(value);
    if (name === 'genreFilter') setGenreFilter(value);
  };

  const openModal = (reportId) => {
    setReportToDelete(reportId);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setReportToDelete(null);
    setModalIsOpen(false);
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      const url = `http://127.0.0.1:8000/my_app/api/report/${reportToDelete}/delete/`;
      const response = await axios.delete(url);
      if (response.status === 200) {
        toast.success('Log deleted successfully');
        closeModal();
        fetchProfile();
      }
    } catch (error) {
      toast.error('Failed to delete report');
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date">{payload[0].payload.date}</p>
          <p className="tooltip-score">Score: <span>{payload[0].value}</span></p>
          <p className="tooltip-topic">{payload[0].payload.topic}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="profile-wrapper">
      <div className="bg-glow-orb"></div>
      
      <div className="profile-container">
        
        {/* --- HEADER --- */}
        <header className="profile-header">
          <div className="user-block">
            <div className="avatar-frame">
              <FaUserAstronaut className="user-avatar" />
            </div>
            <div className="user-info">
              <h1>{user?.username || "Guest User"}</h1>
              <p>{user?.email}</p>
            </div>
          </div>
          
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon-box purple"><FaHistory /></div>
              <div className="stat-text">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Interviews</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-box green"><FaChartLine /></div>
              <div className="stat-text">
                <span className="stat-value">{stats.avgScore}/10</span>
                <span className="stat-label">Avg. Score</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-box blue"><FaTrophy /></div>
              <div className="stat-text">
                <span className="stat-value small">{stats.topTopic}</span>
                <span className="stat-label">Strongest Area</span>
              </div>
            </div>
          </div>
        </header>

        {/* --- PERFORMANCE GRAPH --- */}
        {profileData.length > 1 && (
          <section className="chart-section">
            <div className="section-title">
              <FaBrain /> Performance Trend (Per Question)
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d946ef" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#a1a1aa" tick={{fontSize: 12}} />
                  <YAxis domain={[0, 10]} stroke="#a1a1aa" tick={{fontSize: 12}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#d946ef" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* --- CONTROLS --- */}
        <div className="controls-bar">
          <div className="controls-left">
            <div className="filter-label">
              <FaFilter /> Interview Logs
            </div>
            <div className="filters-group">
              <Box className="custom-select" sx={{ minWidth: 150 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Time</InputLabel>
                  <Select
                    name='timeFilter'
                    value={timeFilter}
                    label="Time"
                    onChange={handleFilterChange}
                    MenuProps={{ PaperProps: { sx: { bgcolor: '#18181b', color: '#fff' } } }}
                  >
                    <MenuItem value="latest">Latest First</MenuItem>
                    <MenuItem value="earliest">Oldest First</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box className="custom-select" sx={{ minWidth: 220 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Topic</InputLabel>
                  <Select
                    name='genreFilter'
                    value={genreFilter}
                    label="Topic"
                    onChange={handleFilterChange}
                    MenuProps={{ PaperProps: { sx: { bgcolor: '#18181b', color: '#fff' } } }}
                  >
                    <MenuItem value="all">All Topics</MenuItem>
                    {genres.map((g, i) => <MenuItem key={i} value={g}>{g}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            </div>
          </div>

          <button className="download-btn" onClick={downloadReport}>
            <FaDownload /> Download Report
          </button>
        </div>

        {/* --- REPORTS GRID --- */}
        <div className="reports-grid">
          {filteredData.length > 0 ? (
            filteredData.map((report, index) => (
              <div key={index} className="report-card">
                <div className="card-top">
                  <span className="topic-badge">{report.genre_name}</span>
                  <span className="date-badge">{formatDate(report.submit_time)}</span>
                </div>

                <div className="card-content">
                  <div className="qa-block">
                    <h4>Question:</h4>
                    <p className="question-text">{report.question}</p>
                  </div>
                  
                  <div className="qa-block">
                    <h4>Your Answer:</h4>
                    <p className="answer-text">{report.user_answer}</p>
                  </div>
                  
                  <div className="ai-feedback-box">
                    <div className="feedback-header">
                      <span>AI Analysis</span>
                      <span className="mini-score">{report.rating}/10</span>
                    </div>
                    <p>{report.feedback}</p>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="delete-btn" onClick={() => openModal(report.id)}>
                    <FaTrashAlt /> Delete Log
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <h3>No Logs Found</h3>
              <p>Start an interview to see data.</p>
            </div>
          )}
        </div>
      </div>

      <ToastContainer theme="dark" position="bottom-right" />

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="glass-modal"
        overlayClassName="modal-overlay"
      >
        <h2>Delete Log?</h2>
        <p>This cannot be undone.</p>
        <div className="modal-btns">
          <button onClick={closeModal} className="btn-cancel">Cancel</button>
          <button onClick={handleDeleteReport} className="btn-delete">Delete</button>
        </div>
      </Modal>
    </div>
  );
}