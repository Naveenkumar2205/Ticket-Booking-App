import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles.css";

const Seat = React.memo(({ isBooked, isSelected, index, onClick }) => (
  <div
    className={`seat ${isBooked ? "booked" : isSelected ? "selected" : "available"}`}
    onClick={!isBooked ? onClick : undefined}
  >
    {index + 1}
  </div>
));

export default function TicketBookingApp() {
  const totalSeats = 80;
  const [seats, setSeats] = useState(Array(totalSeats).fill(false));
  const [selectedSeats, setSelectedSeats] = useState([]);

  const fetchSeats = async () => {
    try {
      const response = await axios.get("http://localhost:5000/seats");
      setSeats(response.data.seats);
    } catch (error) {
      toast.error("Failed to fetch seats.", { className: "toast-dynamic-width" });
    }
  };

  const bookSeats = useCallback(async () => {
    if (selectedSeats.length === 0) {
      toast.warn("Please select at least one seat to book.", {
        className: "toast-dynamic-width",
      });
      return;
    }

    const newSeats = [...seats];
    selectedSeats.forEach((index) => (newSeats[index] = true));
    setSeats(newSeats);
    const seatsToBook = [...selectedSeats];
    setSelectedSeats([]);

    toast.promise(
      axios.post("http://localhost:5000/book", { selectedSeats: seatsToBook }),
      {
        pending: {
          render() {
            return "Booking your seats...";
          },
          className: "toast-dynamic-width",
        },
        success: {
          render() {
            return `Successfully booked ${seatsToBook.length} seat(s)! 🎉`;
          },
          className: "toast-dynamic-width",
        },
        error: {
          render({ data }) {
            return data?.response?.data?.message || "Failed to book seats.";
          },
          className: "toast-dynamic-width",
        },
      }
    ).catch(() => {
      fetchSeats();
    });
  }, [seats, selectedSeats]);

  useEffect(() => {
    fetchSeats();
  }, []);

  const handleSeatClick = (index) => {
    if (!seats[index]) {
      setSelectedSeats((prev) =>
        prev.includes(index)
          ? prev.filter((seat) => seat !== index)
          : [...prev, index]
      );
    }
  };

  const resetSeats = async () => {
    try {
      setSeats(Array(totalSeats).fill(false));
      setSelectedSeats([]);
  
      await toast.promise(
        axios.post("http://localhost:5000/reset"), // Corrected endpoint
        {
          pending: {
            render() {
              return "Resetting seats...";
            },
            className: "toast-dynamic-width",
          },
          success: {
            render() {
              return "All seats have been reset and are now available.";
            },
            className: "toast-dynamic-width",
          },
          error: {
            render({ data }) {
              return data?.response?.data?.message || "Failed to reset seats.";
            },
            className: "toast-dynamic-width",
          },
        }
      );
    } catch (error) {
      // Additional error handling if necessary
      console.error("Error resetting seats:", error);
    }
  };
  

  return (
    <div className="container">
      <h1>Movie Ticket Booking</h1>

      <div className="seat-grid">
        {seats.map((isBooked, index) => (
          <Seat
            key={index}
            isBooked={isBooked}
            isSelected={selectedSeats.includes(index)}
            index={index}
            onClick={() => handleSeatClick(index)}
          />
        ))}
      </div>

      <div className="summary">
        <p className="total-seats">Total Seats: <span>{totalSeats}</span></p>
        <p className="booked-seats">Booked Seats: {seats.filter((seat) => seat).length}</p>
        <p className="available-seats">Available Seats: {totalSeats - seats.filter((seat) => seat).length}</p>
      </div>

      <div className="button-container">
        <button onClick={bookSeats} className="book-btn">
          Confirm Booking ({selectedSeats.length} Seats)
        </button>
        <button onClick={resetSeats} className="book-btn">
          Reset All Seats
        </button>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}
