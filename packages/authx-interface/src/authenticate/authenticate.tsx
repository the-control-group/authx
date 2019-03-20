import React from "react";
import ReactDOM from "react-dom";

function Authenticate() {
  return (
    <div>
      <h1>Authenticate</h1>
      <form>
        <label>
          <span>Email</span>
          <input type="email" />
        </label>
        <label>
          <span>Password</span>
          <input type="password" />
        </label>
        <label>
          <input type="submit" value="Submit" />
        </label>
      </form>
    </div>
  );
}

ReactDOM.render(<Authenticate />, document.getElementById("root"));
