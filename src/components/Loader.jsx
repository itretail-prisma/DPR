<<<<<<< HEAD
import React from "react";
import "../App.css";

const Loader = ({ message = "Loading...", progress = 0, processed = 0, total = 0 }) => {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <div className="loading-message">
        {message}
        {message === "Exporting..." && ` ${processed}/${total} (${progress}%)`}
      </div>
      {message === "Exporting..." && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};

export default Loader;
=======
import React from "react";
import "../App.css";

const Loader = ({ message = "Loading...", progress = 0, processed = 0, total = 0 }) => {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <div className="loading-message">
        {message}
        {message === "Exporting..." && ` ${processed}/${total} (${progress}%)`}
      </div>
      {message === "Exporting..." && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};

export default Loader;
>>>>>>> bf31496 (Initial commit)
