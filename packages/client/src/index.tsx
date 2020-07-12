require("reflect-metadata");
import { HSV } from "@ww/proto/lamp_pb";
import { Api } from "api";
import { AppConfig } from "config";
import React from "react";
import ReactDOM from "react-dom";
import { container } from "tsyringe";
import "./style.css";

const config: AppConfig = {
  httpUrl: "http://192.168.2.36:8081/",
};

container.register("AppConfig", { useValue: config });
const AppContext = React.createContext({
  api: container.resolve(Api),
});

const TurnOffButton: React.FC = () => {
  return (
    <AppContext.Consumer>
      {({ api }) => (
        <button
          onClick={() => {
            api.lamp.setHSV(new HSV().setH(255).setS(255).setV(0)).catch(e => {
              console.log('got err', e)
            })
          }}
        >
          Turn off lamp
        </button>
      )}
    </AppContext.Consumer>
  );
};

const TurnOnButton: React.FC = () => {
  return (
    <AppContext.Consumer>
      {({ api }) => (
        <button
          onClick={() => {
            api.lamp.setHSV(new HSV().setH(255).setS(255).setV(200));
          }}
        >
          Turn on lamp
        </button>
      )}
    </AppContext.Consumer>
  );
};

const App: React.FC = () => {
  return (
    <>
      <TurnOnButton />
      <TurnOffButton />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
