import "./style.css";
import React from "react";
import ReactDOM from "react-dom";

function test(): string {
  return "what up dudes";
}

ReactDOM.render(
  <h1>Hello, world! {test()}</h1>,
  document.getElementById("root")
);
