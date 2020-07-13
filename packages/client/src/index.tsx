require("reflect-metadata");
import { HSV } from "@ww/proto/lamp_pb";
import { Api } from "api";
import { AppConfig } from "config";
import React, { useContext, useRef } from "react";
import ReactDOM from "react-dom";
import { Subject } from "rxjs";
import { debounceTime, tap } from "rxjs/operators";
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
            api.lamp
              .setHSV(new HSV().setH(255).setS(255).setV(0))
              .catch((e) => {
                console.log("got err", e);
              });
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

const subject = new Subject<
  [
    React.MouseEvent<HTMLDivElement, MouseEvent>,
    React.RefObject<HTMLDivElement>,
    Api
  ]
>();

const handler = subject.pipe(
  debounceTime(10),
  tap(([mouseEvent, div, api]) => {
    if (!div.current) {
      return;
    }
    const boundingClientRect = div.current.getBoundingClientRect();
    const x = mouseEvent.clientX - (boundingClientRect.x - 1);
    const y = mouseEvent.clientY - (boundingClientRect.y - 1);
    const percentX = x / boundingClientRect.width;
    const percentY = y / boundingClientRect.height;
    const hue = Math.round(percentX * 170);

    console.log({ x, y, percentX, percentY, hue });
    api.lamp.setHSV(new HSV().setH(hue).setS(255).setV(200));
  })
);

handler.subscribe();

const ColourSelector: React.FC = () => {
  const div = useRef<HTMLDivElement>(null);
  const context = useContext(AppContext);
  return (
    <div
      ref={div}
      onMouseMove={(mouseEvent) => {
        mouseEvent.persist();
        subject.next([mouseEvent, div, context.api]);
      }}
      className="colour-temp"
    ></div>
  );
};

const App: React.FC = () => {
  return (
    <>
      <TurnOnButton />
      <TurnOffButton />
      <ColourSelector />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
