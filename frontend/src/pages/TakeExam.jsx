import API_BASE from '../config/api.js';
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaCheckDouble, FaChevronLeft, FaChevronRight, FaSun, FaMoon } from 'react-icons/fa';
import MonacoEditorWrapper from '../components/MonacoEditorWrapper';
import SmartHints from '../components/SmartHints';
import { useAuth } from '../context/AuthContext';

const TakeExam = () => {
  const { examId } = useParams();
  const { user, darkMode, toggleTheme } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> sql_query
  const [timeLeft, setTimeLeft] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const navigate = useNavigate();

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isWaitingVerification, setIsWaitingVerification] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const lastWarningTimeRef = useRef(0);
  const saveTimeoutRef = useRef({});
  const answersRef = useRef({});

  const incrementWarningSafe = (reason) => {
    const now = Date.now();
    if (now - lastWarningTimeRef.current < 500) {
      return; // Debounce double triggers within 500ms
    }
    lastWarningTimeRef.current = now;
    
    setWarningCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        alert(`Security Alert: ${reason}. Your exam is being automatically submitted.`);
        exitFullscreen().then(() => handleSubmitSilent());
      }
      return next;
    });
  };

  const [isFullscreenActive, setIsFullscreenActive] = useState(
    !!(document.fullscreenElement ||
       document.webkitFullscreenElement ||
       document.mozFullScreenElement ||
       document.msFullscreenElement)
  );
  const [isExitedFullscreen, setIsExitedFullscreen] = useState(false);

  const examContainerRef = useRef(null);
  const isSubmittingRef = useRef(false);

  const warningCountRef = useRef(warningCount);
  useEffect(() => {
    warningCountRef.current = warningCount;
  }, [warningCount]);

  const isFullscreenActiveRef = useRef(isFullscreenActive);
  useEffect(() => {
    isFullscreenActiveRef.current = isFullscreenActive;
  }, [isFullscreenActive]);

  // Lock the user in this screen during verification
  useEffect(() => {
    if (isWaitingVerification) {
      // Push initial history state to intercept the back action
      window.history.pushState(null, '', window.location.href);
      
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
        alert('Verification Pending: You cannot leave this page until your teacher scans the QR code and authorizes your submission.');
      };
      
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Verification Pending: If you reload or close this page, you will need to re-verify your submission. Are you sure?';
        return e.returnValue;
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isWaitingVerification]);

  // Auto-restore fullscreen on any user click or keypress
  useEffect(() => {
    if (!isFullscreenActive) {
      const handleRestore = () => {
        startExamFullscreen();
      };
      window.addEventListener('keydown', handleRestore);
      window.addEventListener('click', handleRestore);
      return () => {
        window.removeEventListener('keydown', handleRestore);
        window.removeEventListener('click', handleRestore);
      };
    }
  }, [isFullscreenActive]);

  useEffect(() => {
    let interval;
    if (isWaitingVerification && data?.submission?.id) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/api/student/exams/submission-status/${data.submission.id}`);
          if (res.data.status === 'Submitted') {
            clearInterval(interval);
            isSubmittingRef.current = true;
            alert('Exam submitted and verified successfully!');
            navigate('/student/dashboard');
          }
        } catch (err) {
          console.error('Error checking verification status:', err);
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWaitingVerification, data, navigate]);



  const startExamFullscreen = async () => {
    if (examContainerRef.current) {
      try {
        const element = examContainerRef.current;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen();
        }
        // Attempt Keyboard Lock for Escape, Tab, Alt, etc.
        if (navigator.keyboard && navigator.keyboard.lock) {
          try {
            await navigator.keyboard.lock(["Escape", "Tab"]);
          } catch (kErr) {
            console.warn("Keyboard Lock failed:", kErr);
          }
        }

        setIsFullscreenActive(true);
        setIsExitedFullscreen(false);
      } catch (err) {
        console.error("Failed to enter fullscreen:", err);
        setIsExitedFullscreen(true);
        alert("Unable to enter fullscreen mode. Please ensure browser permissions are allowed.");
      }
    }
  };

  const exitFullscreen = async () => {
    document.body.classList.remove('blurred-screen');
    
    // Unlock keyboard
    if (navigator.keyboard && navigator.keyboard.unlock) {
      try {
        navigator.keyboard.unlock();
      } catch (kErr) {
        console.warn("Keyboard Unlock failed:", kErr);
      }
    }

    const fsElement = document.fullscreenElement ||
                      document.webkitFullscreenElement ||
                      document.mozFullScreenElement ||
                      document.msFullscreenElement;
    if (fsElement) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      } catch (err) {
        console.error("Failed to exit fullscreen:", err);
      }
    }
  };

  // Anti-cheating listeners (screenshot blocking + tab leave monitor)
  useEffect(() => {
    // 1. Prevent copy/paste/context menu on the main page wrapper
    const handleCopyCut = (e) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', 'Copying is disabled during this exam.');
      }
    };
    const preventDefaults = (e) => {
      e.preventDefault();
    };
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    document.addEventListener('contextmenu', preventDefaults);

    // 2. Keydown interception in capture phase to block screenshots, ctrl+s, etc.
    const handleKeyDownCapture = (e) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        navigator.clipboard.writeText('Screenshots are disabled during this exam.');
        const bodyStyle = document.body.style;
        const originalFilter = bodyStyle.filter;
        bodyStyle.filter = 'blur(30px) brightness(0)';
        alert('Screenshots are strictly prohibited. The screen has been obscured.');
        setTimeout(() => {
          bodyStyle.filter = originalFilter;
        }, 1500);
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + S
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        alert('Saving the page is prohibited during the exam.');
        return false;
      }

      // Ctrl + P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.keyCode === 80)) {
        e.preventDefault();
        e.stopPropagation();
        alert('Printing is prohibited during the exam.');
        return false;
      }

      // Ctrl + U
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        alert('Viewing page source is prohibited during the exam.');
        return false;
      }

      // F11 (Toggle Fullscreen)
      if (e.key === 'F11' || e.keyCode === 122) {
        e.preventDefault();
        e.stopPropagation();
        alert('F11 fullscreen toggle is disabled during the exam.');
        return false;
      }

      // F12 and Ctrl + Shift + I/J/C (Developer Tools)
      if (
        e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J' || e.key === 'c' || e.key === 'C'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        alert('Developer tools are prohibited during the exam.');
        return false;
      }

      // Escape key (blocks default actions; triggers warning modal inside fullscreen if Keyboard Lock is active)
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        
        const isFs = !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );
        
        if (isFs && !showViolationModal) {
          setShowViolationModal(true);
          incrementWarningSafe('You pressed blocked keys');
        }
        return false;
      }

      // Alt + Shift or Alt + Arrow keys
      if (e.altKey && (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.keyCode === 37 || e.keyCode === 39)) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!showViolationModal) {
          setShowViolationModal(true);
          incrementWarningSafe('You pressed blocked keys');
        }
        return false;
      }
    };
    document.addEventListener('keydown', handleKeyDownCapture, true);

    // 3. Monitor page tab changing focus (Cheating/Leaving detection)
    const handleVisibilityChange = () => {
      if (isSubmittingRef.current) return;
      if (document.hidden) {
        incrementWarningSafe('You left the exam tab');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Monitor fullscreen exit
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      
      setIsFullscreenActive(isFs);

      if (isSubmittingRef.current && !isWaitingVerification) return;

      if (isFullscreenActiveRef.current && !isFs) {
        if (isWaitingVerification) return; // Skip warning count/alerts during verification
        setShowViolationModal(false); // Hide the fullscreen violation modal if we went windowed (blocker will cover it)
        incrementWarningSafe('You exited fullscreen mode');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // 5. Prompt before refresh or back
    const handleBeforeUnload = (e) => {
      if (isSubmittingRef.current) return;
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your exam progress might be lost.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 6. Monitor focus and blur to protect against screenshots (Win+Shift+S, snipping tools, focus loss)
    const handleWindowBlur = () => {
      if (isFullscreenActiveRef.current && !isSubmittingRef.current) {
        document.body.classList.add('blurred-screen');
      }
    };

    const handleWindowFocus = () => {
      document.body.classList.remove('blurred-screen');
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('contextmenu', preventDefaults);
      document.removeEventListener('keydown', handleKeyDownCapture, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.body.classList.remove('blurred-screen');
    };
  }, [data]);

  const handleSubmitSilent = async () => {
    if (!data) return;
    try {
      isSubmittingRef.current = true;

      // Clear any pending timeouts
      for (const qId of Object.keys(saveTimeoutRef.current)) {
        if (saveTimeoutRef.current[qId]) {
          clearTimeout(saveTimeoutRef.current[qId]);
        }
      }

      // Save current question answer draft immediately to ensure latest is in DB
      const currentQId = data.questions[currentIdx]?.id;
      if (currentQId) {
        const currentVal = answers[currentQId] || '';
        try {
          await axios.post(`${API_BASE}/api/student/exams/save-draft`, {
            submissionId: data.submission.id,
            questionId: currentQId,
            sqlQuery: currentVal
          });
        } catch (e) {
          console.error("Error saving final draft on silent submission:", e);
        }
      }

      await axios.post(`${API_BASE}/api/student/exams/request-verification`, {
        submissionId: data.submission.id
      });
      setIsWaitingVerification(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code') || '';
        const res = await axios.get(`${API_BASE}/api/student/exams/${examId}?code=${code}`);
        
        if (res.data.submission.status === 'Submitted' || res.data.submission.status === 'Graded') {
          alert('This exam has already been submitted.');
          navigate('/student/dashboard');
          return;
        }

        setData(res.data);
        
        // Map current answers
        const ansMap = {};
        if (res.data.answers && Array.isArray(res.data.answers)) {
          res.data.answers.forEach(a => {
            ansMap[a.question_id] = a.sql_query;
          });
        }
        setAnswers(ansMap);
        answersRef.current = { ...ansMap };

        // Timer start
        setTimeLeft((res.data.exam?.duration_minutes || 0) * 60);

        if (res.data.submission.status === 'PendingVerification') {
          setIsWaitingVerification(true);
        }
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Error loading exam.');
        navigate('/student/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) handleSubmitSilent();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, data]);

  const flushSave = async (qId) => {
    if (saveTimeoutRef.current[qId]) {
      clearTimeout(saveTimeoutRef.current[qId]);
      delete saveTimeoutRef.current[qId];
    }
    const val = answersRef.current[qId] || '';
    try {
      await axios.post(`${API_BASE}/api/student/exams/save-draft`, {
        submissionId: data.submission.id,
        questionId: qId,
        sqlQuery: val
      });
    } catch (err) {
      console.error('Failed to save draft on flush:', err);
    }
  };

  const handleQueryChange = (val) => {
    const qId = data.questions[currentIdx].id;
    setAnswers(prev => ({ ...prev, [qId]: val }));
    answersRef.current[qId] = val;

    if (saveTimeoutRef.current[qId]) {
      clearTimeout(saveTimeoutRef.current[qId]);
    }

    saveTimeoutRef.current[qId] = setTimeout(async () => {
      try {
        await axios.post(`${API_BASE}/api/student/exams/save-draft`, {
          submissionId: data.submission.id,
          questionId: qId,
          sqlQuery: val
        });
      } catch (err) {
        console.error('Failed to auto-save draft:', err);
      } finally {
        delete saveTimeoutRef.current[qId];
      }
    }, 1000);
  };

  const confirmAndSubmit = async () => {
    try {
      setShowSubmitConfirm(false);
      isSubmittingRef.current = true;

      // Clear any pending timeouts
      for (const qId of Object.keys(saveTimeoutRef.current)) {
        if (saveTimeoutRef.current[qId]) {
          clearTimeout(saveTimeoutRef.current[qId]);
        }
      }

      // Save current question answer draft immediately to ensure latest is in DB
      const currentQId = data.questions[currentIdx].id;
      const currentVal = answersRef.current[currentQId] || '';
      try {
        await axios.post(`${API_BASE}/api/student/exams/save-draft`, {
          submissionId: data.submission.id,
          questionId: currentQId,
          sqlQuery: currentVal
        });
      } catch (e) {
        console.error("Error saving final draft:", e);
      }

      await axios.post(`${API_BASE}/api/student/exams/request-verification`, {
        submissionId: data.submission.id
      });
      setIsWaitingVerification(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Error requesting verification.');
      isSubmittingRef.current = false;
    }
  };


  const handleSubmit = () => {
    setShowSubmitConfirm(true);
  };

  if (loading || !data) return <div className="container mt-4"><div className="skeleton-line" /></div>;

  if (!data.questions || data.questions.length === 0) {
    return (
      <div className="container mt-4 text-center">
        <div className="card glass-card p-5 shadow border-danger" style={{ maxWidth: '500px', margin: '100px auto' }}>
          <h3 className="text-danger fw-bold mb-3">No Questions Found</h3>
          <p className="text-muted mb-4">This exam does not have any questions assigned. Please contact your instructor.</p>
          <button className="btn btn-primary fw-bold" onClick={() => navigate('/student/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = data?.questions?.[currentIdx];
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div ref={examContainerRef} className={`fullscreen-exam-container ${isFullscreenActive ? 'is-fullscreen' : ''}`} style={{ position: 'relative', minHeight: '100vh' }}>
      {!isFullscreenActive ? (
        <div 
          className="secure-overlay" 
          style={{ zIndex: 9999999, cursor: 'pointer', background: 'rgba(9, 13, 22, 0.98)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
          onClick={startExamFullscreen}
        >
          {warningCount === 0 ? (
            <div className="card glass-card p-4 p-sm-5 text-center shadow-lg border-primary" style={{ maxWidth: '500px', borderRadius: '24px' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="fw-bold mb-3 text-primary">Secure Exam Session</h3>
              <p className="text-muted mb-4">
                This secure exam requires fullscreen mode to prevent cheating and browser navigation.
              </p>
              <button className="btn btn-primary btn-lg w-100 fw-bold shadow animate-pulse" onClick={startExamFullscreen}>
                Start Exam
              </button>
              <span className="text-muted small d-block mt-3">Or click anywhere on this screen to start</span>
            </div>
          ) : (
            <div className="card glass-card p-4 p-sm-5 text-center shadow-lg border-danger" style={{ maxWidth: '500px', borderRadius: '24px' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="fw-bold mb-3 text-danger">Secure Mode Violation!</h3>
              <p className="text-muted mb-4">
                You have exited fullscreen mode or pressed a restricted key. You must return to fullscreen mode immediately to resume your exam.
              </p>
              {!isWaitingVerification && (
                <div className="alert alert-danger py-2 mb-4">
                  <strong className="fs-5 text-danger">Warning {warningCount} / 3</strong>
                  <br />
                  <span className="small text-muted">At 3 warnings, your exam will be automatically submitted.</span>
                </div>
              )}
              <button className="btn btn-danger btn-lg w-100 fw-bold shadow animate-pulse" onClick={startExamFullscreen}>
                Resume Exam
              </button>
              <span className="text-muted small d-block mt-3">Or click anywhere on this screen to resume</span>
            </div>
          )}
        </div>
      ) : isWaitingVerification ? (
        <div className="secure-overlay" style={{ zIndex: 9999999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', minHeight: '100vh' }}>
          <div className="card glass-card p-3 p-sm-5 text-center shadow-lg border-success" style={{ maxWidth: '500px', borderRadius: '24px', width: '90%' }}>
            <h3 className="fw-bold mb-3 text-success">Verification Required</h3>
            <p className="mb-3 text-muted">
              Your exam answers have been saved and locked. Please ask your teacher to scan the QR code below from their phone to authorize your submission.
            </p>
            <div className="badge bg-secondary mb-4 fs-6 px-3 py-2 text-white" style={{ width: 'fit-content', margin: '0 auto' }}>
              Submission ID: #{data?.submission?.id}
            </div>
            <div className="d-flex justify-content-center mb-4">
              <div className="p-2 p-sm-3 bg-white rounded-4 shadow-sm" style={{ width: 'fit-content' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    `${window.location.origin}/verify-submission/${data?.submission?.id}`
                  )}`} 
                  alt="Submission Verification QR Code" 
                  style={{ width: '220px', maxWidth: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-center gap-3 text-muted">
              <span className="spinner-border spinner-border-sm text-success" role="status" />
              <span>Waiting for teacher authorization...</span>
            </div>
          </div>
        </div>
      ) : (
        <>

          {showSubmitConfirm && (
            <div className="secure-overlay" style={{ zIndex: 9999999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', minHeight: '100vh' }}>
              <div className="card glass-card p-4 p-sm-5 text-center shadow-lg border-success" style={{ maxWidth: '500px' }}>
                <h3 className="fw-bold mb-3 text-success">Submit Exam?</h3>
                <p className="mb-4 text-muted">
                  Are you sure you want to finalize and submit the exam? You will not be able to edit your answers after this.
                </p>
                <div className="d-flex gap-3">
                  <button className="btn btn-success btn-lg flex-grow-1 fw-bold shadow" onClick={confirmAndSubmit}>
                    Yes, Submit
                  </button>
                  <button className="btn btn-outline-secondary btn-lg flex-grow-1 fw-bold" onClick={() => setShowSubmitConfirm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showViolationModal && (
            <div className="secure-overlay" style={{ zIndex: 9999999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', minHeight: '100vh', background: 'rgba(9, 13, 22, 0.95)' }}>
              <div className="card glass-card p-4 p-sm-5 text-center shadow-lg border-danger" style={{ maxWidth: '500px', borderRadius: '24px' }}>
                <h3 className="fw-bold mb-3 text-danger">Secure Mode Violation!</h3>
                <p className="text-muted mb-4">
                  You have pressed a restricted key combination (Escape or Alt shortcut). You must return to the exam immediately.
                </p>
                <div className="alert alert-danger py-2 mb-4">
                  <strong className="fs-5 text-danger">Warning {warningCount} / 3</strong>
                  <br />
                  <span className="small text-muted">At 3 warnings, your exam will be automatically submitted.</span>
                </div>
                <button className="btn btn-danger btn-lg w-100 fw-bold shadow animate-pulse" onClick={() => setShowViolationModal(false)}>
                  Resume Exam
                </button>
              </div>
            </div>
          )}
          
          <>
              {isExitedFullscreen && (
                <div className="secure-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', minHeight: '100vh', zIndex: 9999 }}>
                  <div className="card glass-card p-4 p-sm-5 text-center shadow-lg border-danger" style={{ maxWidth: '500px' }}>
                    <h3 className="fw-bold mb-3 text-danger">Secure Mode Violation!</h3>
                    <p className="mb-4 text-muted">
                      You have exited fullscreen mode. To continue your exam, you must return to fullscreen mode immediately.
                    </p>
                    <div className="alert alert-danger mb-4 py-2">
                      <strong className="fs-5 text-danger">Warnings: {warningCount} / 3</strong>
                      <br />
                      <span className="small text-muted">At 3 warnings, your exam will be automatically submitted.</span>
                    </div>
                    <button className="btn btn-danger btn-lg w-100 fw-bold shadow" onClick={startExamFullscreen}>
                      Resume Fullscreen Mode
                    </button>
                  </div>
                </div>
              )}

              <div className="container mt-4 animated-fade">

                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
                  <div>
                    <h3 className="fw-bold mb-0">{data.exam.title}</h3>
                    <span className="text-muted">{data.exam.subject_name}</span>
                  </div>
                  <div className="card glass-card px-4 py-2 border-danger text-danger fw-bold fs-5" style={{ width: 'fit-content' }}>
                    Time Left: {formatTime(timeLeft)}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-5 mb-4">
                    <div className="card glass-card p-4 mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="badge bg-secondary">Question {currentIdx + 1} of {data.questions.length}</span>
                        <span className="badge bg-success">{currentQuestion.points} Points</span>
                      </div>
                      <h5 className="fw-bold">{currentQuestion.title}</h5>
                      <p className="text-muted" style={{ whiteSpace: 'pre-line' }}>{currentQuestion.description}</p>
                    </div>

                    {data.exam.database_schema && (
                      <div className="card glass-card p-3 mb-4 border-info">
                        <div className="d-flex justify-content-between align-items-center" onClick={() => setShowSchema(!showSchema)} style={{ cursor: 'pointer' }}>
                          <h6 className="fw-bold mb-0 text-info">📋 Database Schema / Table Reference</h6>
                          <button type="button" className="btn btn-sm btn-link text-info p-0 text-decoration-none fw-bold" style={{ fontSize: '0.8rem' }}>
                            {showSchema ? 'Hide ▲' : 'Show ▼'}
                          </button>
                        </div>
                        {showSchema && (
                          <div className="mt-3 border-top pt-3">
                            <pre className="p-2 rounded bg-light font-monospace text-dark mb-0" style={{ fontSize: '0.82rem', maxHeight: '250px', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid #dee2e6' }}>
                              {data.exam.database_schema}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    <SmartHints sqlQuery={answers[currentQuestion.id] || ''} />
                  </div>

                  <div className="col-md-7 mb-4">
                    <MonacoEditorWrapper 
                      value={answers[currentQuestion.id] || ''}
                      onChange={handleQueryChange}
                    />

                    <div className="d-flex justify-content-between mt-3">
                      <button 
                        className="btn btn-outline-secondary d-flex align-items-center gap-1"
                        disabled={currentIdx === 0}
                        onClick={async () => {
                          await flushSave(currentQuestion.id);
                          setCurrentIdx(prev => prev - 1);
                        }}
                      >
                        <FaChevronLeft /> Prev
                      </button>
                      
                      {currentIdx < data.questions.length - 1 ? (
                        <button 
                          className="btn btn-outline-secondary d-flex align-items-center gap-1"
                          onClick={async () => {
                            await flushSave(currentQuestion.id);
                            setCurrentIdx(prev => prev + 1);
                          }}
                        >
                          Next <FaChevronRight />
                        </button>
                      ) : (
                        <button 
                          className="btn btn-success d-flex align-items-center gap-2"
                          onClick={handleSubmit}
                        >
                          <FaCheckDouble /> Final Submit Exam
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          </>
        )}
    </div>
  );
};

export default TakeExam;


