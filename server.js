const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// SQLite database setup
const db = new sqlite3.Database("./seats.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    db.run(
      `CREATE TABLE IF NOT EXISTS seats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seat_number INTEGER UNIQUE,
        is_booked INTEGER DEFAULT 0
      )`,
      (err) => {
        if (err) {
          console.error("Error creating table:", err.message);
        } else {
          db.get("SELECT COUNT(*) as count FROM seats", (err, row) => {
            if (row.count === 0) {
              const stmt = db.prepare("INSERT INTO seats (seat_number, is_booked) VALUES (?, 0)");
              for (let i = 1; i <= 80; i++) {
                stmt.run(i);
              }
              stmt.finalize();
              console.log("Initialized 80 seats.");
            }
          });
        }
      }
    );
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Seat Booking API! Use /seats to view the seat status or /book to book seats.");
});

app.get("/seats", (req, res) => {
  db.all("SELECT seat_number, is_booked FROM seats ORDER BY seat_number", (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching seats." });
    }
    const seats = Array(80).fill(false);
    rows.forEach((row) => {
      seats[row.seat_number - 1] = Boolean(row.is_booked);
    });
    res.json({
      totalSeats: 80,
      bookedSeats: rows.filter((row) => row.is_booked).length,
      availableSeats: rows.filter((row) => !row.is_booked).length,
      seats,
    });
  });
});

app.post("/book", (req, res) => {
  const { selectedSeats } = req.body;

  if (!selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
    return res.status(400).json({ message: "No seats selected for booking." });
  }

  const placeholders = selectedSeats.map(() => "?").join(",");
  db.all(
    `SELECT seat_number FROM seats WHERE seat_number IN (${placeholders}) AND is_booked = 1`,
    selectedSeats.map((index) => index + 1),
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Error checking seat availability." });
      }
      if (rows.length > 0) {
        return res.status(400).json({ message: "Some selected seats are already booked." });
      }

      const stmt = db.prepare("UPDATE seats SET is_booked = 1 WHERE seat_number = ?");
      selectedSeats.forEach((index) => {
        stmt.run(index + 1);
      });
      stmt.finalize();

      res.json({
        message: "Seats successfully booked!",
        bookedSeats: selectedSeats,
      });
    }
  );
});

app.post("/reset", (req, res) => {
  db.run("UPDATE seats SET is_booked = 0", (err) => {
    if (err) {
      return res.status(500).json({ message: "Error resetting seats." });
    }
    res.json({
      message: "All seats reset to available.",
      totalSeats: 80,
      bookedSeats: 0,
      availableSeats: 80,
      seats: Array(80).fill(false),
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    }
    console.log("Database connection closed.");
    process.exit(0);
  });
});
