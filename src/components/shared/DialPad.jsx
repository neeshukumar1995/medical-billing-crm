'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/config/api'
import RingCentral from '@ringcentral/sdk'
import { formatDate, formatTime } from '@/utils/formatDate'

const DialPad = ({ show, onClose }) => {
  const [currentNumber, setCurrentNumber] = useState('')
  const [isCalling, setIsCalling] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

   const [isClosed, setIsClosed] = useState(false)
    const [position, setPosition] = useState({ x: 100, y: 100 }) // Default position
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [callHistoryData, setCallHistoryData] = useState([
    { number: '+1 (234) 567-8900', time: '10:30 AM', date: 'Today' },
    { number: '411', time: 'Yesterday', date: '2:15 PM' },
    { number: '*123#', time: 'Jan 12', date: '11:45 AM' },
    { number: '911', time: 'Jan 10', date: '9:20 AM' }
  ])

  const updateDisplay = () => {
    // Handled in render
  }

  const formatPhoneNumber = (number) => {
    if (number.length <= 3) {
      return number
    } else if (number.length <= 6) {
      return number.slice(0, 3) + '-' + number.slice(3)
    } else {
      return number.slice(0, 3) + '-' + number.slice(3, 6) + '-' + number.slice(6, 12)
    }
  }

  const addNumber = (number) => {
    if (number === '0' && currentNumber === '') {
      setCurrentNumber('+')
    } else {
      setCurrentNumber(prev => prev.length < 13 ? prev + number : prev)
    }
  }

  const clearNumber = () => {
    setCurrentNumber('')
  }

  const makeCall = async () => {
    if (!currentNumber.trim()) {
  //alert('Please enter a phone number firstnn.')
      return
    }

    try {
      setIsCalling(true)
       
      const response = await fetch(`${API_BASE_URL}/ringcentral/make-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: currentNumber
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.status) {
        console.log('Call initiated successfully:', data)
        // Add to call history
        const now = new Date()
        const timeString = formatTime(now)
        const dateString = formatDate(now)

        setCallHistoryData(prev => [{
          number: currentNumber,
          time: timeString,
          date: dateString
        }, ...prev])

        //alert(`Calling ${formatPhoneNumber(currentNumber)}...\n\n(This is a simulation - no actual call is being made)`)
        setCurrentNumber('')
      } else {
        throw new Error(data.message || 'Failed to make call')
      }
    } catch (error) {
      console.error('Make call failed:', error)
      alert('Failed to make call: ' + error.message)
    } finally {
      setIsCalling(false)
    }
  }

  const toggleCallHistory = () => {
    setShowHistory(prev => !prev)
  }

  const closePopup = () => {
    setIsClosed(true)
    if (onClose) {
      setTimeout(() => onClose(), 300)
    }
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const addButtonAnimation = (buttonRef) => {
    if (buttonRef.current) {
      buttonRef.current.classList.add('pulse')
      setTimeout(() => {
        buttonRef.current.classList.remove('pulse')
      }, 300)
    }
  }

  useEffect(() => {
    if (show) {
      setIsClosed(false)
    }
  }, [show])

  useEffect(() => {
    setPosition({ x: window.innerWidth - 340, y: window.innerHeight - 600 })
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key

      if ((key >= '0' && key <= '9') || key === '*' || key === '#') {
        addNumber(key)
      } else if (key === 'Backspace' || key === 'Delete') {
        clearNumber()
      } else if (key === 'Enter') {
        makeCall()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentNumber])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentNumber === '') {
        // Temporary welcome message - handled in render
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .phone-container {
          width: 100%;
          max-width: 320px;
          background-color: #fff;
          border-radius: 20px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          border: 10px solid #222;
          position: fixed;
          left: ${position.x}px;
          top: ${position.y}px;
          z-index: 1000;
          transition: ${isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease'};
          resize: both;
          min-width: 280px;
          min-height: 400px;
        }

        .phone-container:not(.show) {
          display: none;
        }

        .phone-container.show.closed {
          transform: translateY(100vh);
          opacity: 0;
          visibility: hidden;
        }

        .phone-header {
          background: linear-gradient(to right, #2c3e50, #4a6491);
          color: white;
          padding: 15px;
          text-align: center;
          border-bottom: 1px solid #ddd;
          position: relative;
        }

        .close-button {
          display: block;
          margin: 10px auto 0;
          background: #e74c3c;
          border: none;
          color: white;
          font-size: 1rem;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 20px;
          transition: background 0.2s;
        }

        .close-button:hover {
          background: #c0392b;
        }

        .phone-header h1 {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 3px;
        }

        .phone-header p {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .display-container {
          padding: 15px 15px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #eaeaea;
        }

        .number-display {
          background-color: white;
          border: 2px solid #ddd;
          border-radius: 10px;
          padding: 4px 16px;
          font-size: 1.6rem;
          text-align: right;
          letter-spacing: 2px;
          color: #333;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          overflow-x: auto;
          white-space: nowrap;
        }

        .dial-pad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 12px;
          background-color: #fff;
        }

        .dial-button {
          aspect-ratio: 1;
          border: none;
         
          background: linear-gradient(145deg, #f0f0f0, #ffffff);
          box-shadow: 4px 4px 8px #d9d9d9, -4px -4px 8px #ffffff;
          font-size: 2rem;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          transition: all 0.2s ease;
          position: relative;
        }

        .dial-button:hover {
          transform: translateY(-3px);
          box-shadow: 7px 7px 14px #d9d9d9, -7px -7px 14px #ffffff;
        }

        .dial-button:active {
          transform: translateY(1px);
          box-shadow: 2px 2px 5px #d9d9d9, -2px -2px 5px #ffffff;
        }

        .dial-button .sub-text {
          font-size: 0.6rem;
          font-weight: 400;
          color: #666;
          margin-top: 2px;
          letter-spacing: 1px;
        }

        .dial-button.zero {
          grid-column: 2;
        }

        .action-buttons {
          display: flex;
          justify-content: space-between;
          padding: 0 20px 15px;
          gap: 12px;
        }

        .action-button {
          flex: 1;
          padding: 14px;
          border: none;
          border-radius: 40px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .call-button {
          background: linear-gradient(to right, #2ecc71, #27ae60);
          color: white;
        }

        .clear-button {
          background: linear-gradient(to right, #e74c3c, #c0392b);
          color: white;
        }

        .action-button:active {
          transform: translateY(1px);
        }

        .call-history {
          padding: 0 20px 15px;
          display: ${showHistory ? 'block' : 'none'};
        }

        .call-history h3 {
          margin-bottom: 10px;
          color: #2c3e50;
          font-size: 1rem;
        }

        .call-history-list {
          list-style-type: none;
          max-height: 120px;
          overflow-y: auto;
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 6px;
        }

        .call-history-list li {
          padding: 8px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
        }

        .call-history-list li:last-child {
          border-bottom: none;
        }

        .recent-calls-toggle {
          display: block;
          text-align: center;
          color: #3498db;
          margin: 10px auto 0;
          background: none;
          border: none;
          font-size: 0.8rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .instruction {
          text-align: center;
          padding: 10px;
          color: #7f8c8d;
          font-size: 0.8rem;
          border-top: 1px solid #eee;
          margin-top: 6px;
        }

        @media (max-width: 480px) {
          .phone-container {
            border-width: 6px;
            max-width: 280px;
          }

          .dial-pad {
            padding: 12px;
            gap: 6px;
          }

          .action-buttons {
            padding: 0 15px 12px;
          }

          .number-display {
            font-size: 1.4rem;
            padding: 10px;
            min-height: 40px;
          }

          .phone-header {
            padding: 10px;
          }

          .display-container {
            padding: 12px 12px;
          }

          .call-history {
            padding: 0 15px 12px;
          }

          .instruction {
            padding: 8px;
            margin-top: 5px;
          }
        }

        .pulse {
          animation: pulse 0.5s ease-in-out;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className={`phone-container ${show ? 'show' : ''} ${isClosed ? 'closed' : ''}`}>
        <div className="phone-header" onMouseDown={handleMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
           
          <p><i className="fas fa-phone-alt"></i>📞 Phone Dial Pad</p>
        </div>

        <div className="display-container">
          <div className="number-display">
            <span style={{ color: currentNumber === '' ? '#999' : '#333' }}>
              {currentNumber === '' ? 'Enter number' : formatPhoneNumber(currentNumber)}
            </span>
          </div>
        </div>

        <button className="close-button" onClick={closePopup}>
          <i className="fas fa-times"></i>
        </button>

        <div className="dial-pad">
          <button className="dial-button" data-number="1" onClick={() => addNumber('1')}>
            1
            <span className="sub-text"></span>
          </button>
          <button className="dial-button" data-number="2" onClick={() => addNumber('2')}>
            2
            <span className="sub-text">ABC</span>
          </button>
          <button className="dial-button" data-number="3" onClick={() => addNumber('3')}>
            3
            <span className="sub-text">DEF</span>
          </button>
          <button className="dial-button" data-number="4" onClick={() => addNumber('4')}>
            4
            <span className="sub-text">GHI</span>
          </button>
          <button className="dial-button" data-number="5" onClick={() => addNumber('5')}>
            5
            <span className="sub-text">JKL</span>
          </button>
          <button className="dial-button" data-number="6" onClick={() => addNumber('6')}>
            6
            <span className="sub-text">MNO</span>
          </button>
          <button className="dial-button" data-number="7" onClick={() => addNumber('7')}>
            7
            <span className="sub-text">PQRS</span>
          </button>
          <button className="dial-button" data-number="8" onClick={() => addNumber('8')}>
            8
            <span className="sub-text">TUV</span>
          </button>
          <button className="dial-button" data-number="9" onClick={() => addNumber('9')}>
            9
            <span className="sub-text">WXYZ</span>
          </button>
          <button className="dial-button" data-number="*" onClick={() => addNumber('*')}>
            *
            <span className="sub-text"></span>
          </button>
          <button className="dial-button zero" data-number="0" onClick={() => addNumber('0')}>
            0
            <span className="sub-text">+</span>
          </button>
          <button className="dial-button" data-number="#" onClick={() => addNumber('#')}>
            #
            <span className="sub-text"></span>
          </button>
        </div>

        <div className="action-buttons">
          <button className="action-button clear-button" onClick={clearNumber}>
            <i className="fas fa-backspace"></i> Clear
          </button>
          <button className="action-button call-button" onClick={makeCall} disabled={isCalling}>
            <i className="fas fa-phone"></i> {isCalling ? 'Calling...' : 'Call'}
          </button>
        </div>
 
 
      </div>
    </>
  )
}

export default DialPad