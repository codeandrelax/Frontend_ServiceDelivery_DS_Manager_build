<template>
  <div>
    <!-- Main Calendar for time selection -->
    <FullCalendar :options="mainCalendarOptions" />

    <!-- Modal Popup -->
    <div v-if="showDateRangePicker" class="modal-overlay">
      <div class="modal">
        <h3>Select Dates & Playlist Options</h3>
        <!-- Section 1: Mini Calendars for Date Range Selection -->
        <div class="mini-calendars">
          <div class="mini-calendar">
            <h4>Start Date</h4>
            <FullCalendar :options="miniCalendarOptions('start')" />
            <div v-if="startDate" class="selected-date">Selected: {{ startDate }}</div>
          </div>
          <div class="mini-calendar">
            <h4>End Date</h4>
            <FullCalendar :options="miniCalendarOptions('end')" />
            <div v-if="endDate" class="selected-date">Selected: {{ endDate }}</div>
          </div>
        </div>
        
        <!-- Section 2: Playlist Options -->
        <div class="playlist-section">
          <h3>Playlist Options</h3>
          <div class="playlist-buttons">
            <button @click="setPlaylistMode('choose')" :class="{ active: playlistMode==='choose' }">Choose a Playlist</button>
            <button @click="setPlaylistMode('make')" :class="{ active: playlistMode==='make' }">Make a Playlist</button>
          </div>
          <div v-if="playlistMode === 'choose'" class="choose-playlist">
            <p>Given playlist below:</p>
            <ul>
              <li v-for="(playlist, index) in dummyPlaylists" :key="index">{{ playlist }}</li>
            </ul>
          </div>
          <div v-else-if="playlistMode === 'make'" class="make-playlist">
            <p>Create a Weighted Playlist:</p>
            <div v-for="(commercial, index) in dummyCommercials" :key="index" class="commercial-item">
              <span>{{ commercial.name }}</span>
              <input type="text" v-model="commercial.percentage" placeholder="Enter percentage" />
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="applyToDateRange">Apply</button>
          <button @click="cancelDateSelection">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default {
  components: { FullCalendar },
  data() {
    return {
      // Main calendar options used for time selection
      mainCalendarOptions: {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: "timeGridWeek",
        selectable: true,
        slotDuration: "00:30:00",
        slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
        select: this.handleSelect,
        events: []
      },
      // Selected time slot from main calendar (object with startTime & endTime as ISO strings)
      selectedTime: null,
      // Modal state for date range selection
      showDateRangePicker: false,
      startDate: "",
      endDate: "",
      // Booked events stored by date (YYYY-MM-DD as key)
      // Each value is an array of { start, end } (ISO strings)
      bookedTimes: {},
      // Playlist Options
      playlistMode: null, // either 'choose' or 'make'
      dummyPlaylists: ["Playlist A", "Playlist B", "Playlist C"],
      dummyCommercials: [
        { name: "Commercial 1", percentage: "" },
        { name: "Commercial 2", percentage: "" },
        { name: "Commercial 3", percentage: "" }
      ]
    };
  },
  methods: {
    // Called when a time slot is selected on the main calendar
    handleSelect(info) {
      const confirmSelection = confirm(
        `Do you want to apply this time (${info.startStr} - ${info.endStr}) to multiple days?`
      );
      if (confirmSelection) {
        this.selectedTime = {
          startTime: info.startStr,
          endTime: info.endStr
        };
        this.showDateRangePicker = true;
        // Reset playlist mode when modal opens
        this.playlistMode = null;
      }
    },
    // Returns a Date object representing the candidate start time on a given day
    candidateStartForDay(dateStr) {
      const timePart = this.selectedTime.startTime.split("T")[1];
      return new Date(`${dateStr}T${timePart}`);
    },
    // Returns a Date object representing the candidate end time on a given day
    candidateEndForDay(dateStr) {
      const timePart = this.selectedTime.endTime.split("T")[1];
      return new Date(`${dateStr}T${timePart}`);
    },
    // Check if the candidate time slot for a given date overlaps any booked slot for that day
    isTimeSlotBooked(dateStr) {
      if (!this.bookedTimes[dateStr]) return false;
      const candidateStart = this.candidateStartForDay(dateStr).getTime();
      const candidateEnd = this.candidateEndForDay(dateStr).getTime();
      return this.bookedTimes[dateStr].some(slot => {
        const bookedStart = new Date(slot.start).getTime();
        const bookedEnd = new Date(slot.end).getTime();
        return bookedStart < candidateEnd && bookedEnd > candidateStart;
      });
    },
    // Returns mini calendar options for either "start" or "end" date selection
    miniCalendarOptions(mode) {
      return {
        plugins: [dayGridPlugin, interactionPlugin],
        initialView: "dayGridMonth",
        headerToolbar: { left: "prev,next today", center: "title", right: "" },
        fixedWeekCount: false,
        dayCellDidMount: (info) => {
          const dateStr = info.date.toISOString().split("T")[0];
          if (!this.selectedTime) {
            info.el.style.backgroundColor = "white";
            return;
          }
          if (this.isTimeSlotBooked(dateStr)) {
            info.el.style.backgroundColor = "lightcoral";
          } else {
            info.el.style.backgroundColor = "lightgreen";
          }
        },
        dateClick: (info) => {
          const dateStr = info.dateStr;
          if (this.isTimeSlotBooked(dateStr)) {
            alert(`Time slot already booked on ${dateStr}`);
            return;
          }
          if (mode === "start") {
            this.startDate = dateStr;
          } else {
            this.endDate = dateStr;
          }
        }
      };
    },
    // Apply the selected time slot to every day between startDate and endDate.
    applyToDateRange() {
      if (!this.startDate || !this.endDate) {
        alert("Please select both start and end dates.");
        return;
      }
      let currentDate = new Date(this.startDate);
      const endDateObj = new Date(this.endDate);
      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split("T")[0];
        if (this.isTimeSlotBooked(dateStr)) {
          alert(`Time period already booked on ${dateStr}. Skipping.`);
        } else {
          if (!this.bookedTimes[dateStr]) {
            this.bookedTimes[dateStr] = [];
          }
          const startDateTime = this.candidateStartForDay(dateStr);
          const endDateTime = this.candidateEndForDay(dateStr);
          this.bookedTimes[dateStr].push({
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString()
          });
          this.mainCalendarOptions.events.push({
            title: "Selected",
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            backgroundColor: "red",
            borderColor: "red"
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      // Here you can also handle the playlist data (dummy or real) as needed.
      console.log("Playlist Mode:", this.playlistMode);
      if (this.playlistMode === "choose") {
        console.log("Chosen playlist:", this.dummyPlaylists);
      } else if (this.playlistMode === "make") {
        console.log("Weighted playlist data:", this.dummyCommercials);
      }
      // Reset modal state.
      this.showDateRangePicker = false;
      this.startDate = "";
      this.endDate = "";
      this.playlistMode = null;
    },
    cancelDateSelection() {
      this.showDateRangePicker = false;
      this.startDate = "";
      this.endDate = "";
      this.playlistMode = null;
    },
    // Set the playlist mode: 'choose' or 'make'
    setPlaylistMode(mode) {
      this.playlistMode = mode;
    }
  }
};
</script>

<style scoped>
/* Main Calendar Styles */
.fc {
  max-width: 100%;
  margin: 20px auto;
}
.fc-event {
  background-color: red !important;
  border-color: red !important;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

/* Modal Box */
.modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  position: relative;
  max-width: 800px;
  width: 90%;
}
.modal button {
  margin: 10px;
  padding: 10px 15px;
  border: none;
  cursor: pointer;
}

/* Mini Calendars */
.mini-calendars {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
}
.mini-calendar {
  width: 45%;
}
.selected-date {
  margin-top: 10px;
  font-weight: bold;
}

/* Playlist Section */
.playlist-section {
  border-top: 1px solid #ccc;
  padding-top: 15px;
  margin-top: 20px;
  text-align: left;
}
.playlist-buttons {
  display: flex;
  justify-content: space-around;
  margin-bottom: 10px;
}
.playlist-buttons button {
  padding: 8px 12px;
  cursor: pointer;
}
.playlist-buttons button.active {
  background-color: #007bff;
  color: white;
}
.choose-playlist ul {
  list-style: none;
  padding: 0;
}
.commercial-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.commercial-item input {
  width: 100px;
  padding: 4px;
}
.modal-actions {
  margin-top: 15px;
}
</style>
