// src/components/BookingModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BookingModal = ({ service, onClose, onBook }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, addBooking } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please login to book a service');
      onClose();
      return;
    }
    
    if (!date || !time) {
      alert('Please select date and time');
      return;
    }
    
    setSubmitting(true);
    
    const booking = await addBooking(service.id, service.name, date, time, notes);
    onBook(booking);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Book {service.name}</h2>
        
        <div className="service-info">
          <p>📍 {service.address}</p>
          <p>📞 {service.phone}</p>
          <p>💰 {service.priceRange}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Select Time</label>
            <select value={time} onChange={(e) => setTime(e.target.value)} required>
              <option value="">Choose time slot</option>
              <option value="09:00">09:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="12:00">12:00 PM</option>
              <option value="14:00">02:00 PM</option>
              <option value="15:00">03:00 PM</option>
              <option value="16:00">04:00 PM</option>
              <option value="17:00">05:00 PM</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Additional Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific requirements?"
              rows="3"
            />
          </div>
          
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;