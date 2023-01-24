import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState
} from "react";
import { v4 as uuidv4 } from "uuid";
import "./global.css";

const stickyStyle = {
  position: "sticky",
  left: 0,
  // background: "#fff",
  zIndex: 2
};

const StickyContext = createContext();

function stickyReducer(state, action) {
  switch (action.type) {
    case "add": {
      return { stickies: [...state.stickies, action.payload] };
    }
    case "setSticky": {
      return {
        stickies: state.stickies.map((sticky) =>
          sticky.id === action.payload.id
            ? { ...sticky, isSticky: action.payload.isSticky }
            : sticky
        )
      };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

function StickyContextProvider({ children }) {
  const [state, dispatch] = useReducer(stickyReducer, { stickies: [] });
  // NOTE: you *might* need to memoize this value
  // Learn more in http://kcd.im/optimize-context
  const value = { state, dispatch };
  return (
    <StickyContext.Provider value={value}>{children}</StickyContext.Provider>
  );
}

function useStickyContextValue() {
  const value = useContext(StickyContext);

  if (value === undefined) {
    throw new Error("useCount must be used within a CountProvider");
  }

  return value;
}

function useStickyStore() {
  const { state, dispatch } = useStickyContextValue();

  const hasSticky = (id) => state.stickies.map(({ id }) => id).includes(id);
  const addSticky = (newSticky) =>
    dispatch({ type: "add", payload: { ...newSticky, isSticky: false } });
  const setIsSticky = (id, isSticky) =>
    dispatch({ type: "setSticky", payload: { id, isSticky } });

  return { state, addSticky, hasSticky, setIsSticky };
}

function useSticky(name, below = []) {
  if (!name) {
    throw new Error(`useSticky needs a name!`);
  }

  const [id] = useState(() => uuidv4());
  const [offset, setOffset] = useState(0);
  const [index, setIndex] = useState(0);
  const ref = useRef();
  const { addSticky, hasSticky, setIsSticky, state } = useStickyStore();

  useEffect(() => {
    if (!ref.current) return;
    if (!hasSticky(id)) {
      addSticky({ id, ref, name });
      return;
    }

    let offset = 0;
    let index = 100;
    for (let a of state.stickies) {
      if (a.ref.current && below.includes(a.name)) {
        offset += a.ref.current.getBoundingClientRect().height;
        index--;
      }
    }
    setOffset(offset);
    setIndex(index);
  }, [addSticky, hasSticky, id, ref, name, below, state.stickies]);

  const sticky = state.stickies.find((sticky) => sticky.id === id);

  return {
    ref,
    style: { ...stickyStyle, top: `${offset}px`, zIndex: index },
    isSticky: sticky ? sticky.isSticky : false,
    offset,
    setIsSticky: setIsSticky.bind(null, id)
  };
}

function ScrollSpy({ name, rootRef, rootMargin = "0px" }) {
  const spyRef = useRef();

  useEffect(() => {
    if (!spyRef.current) return;

    const callback = ([{ boundingClientRect, isIntersecting }]) => {
      if (!isIntersecting && boundingClientRect.top < 0) {
        console.log(`${name} is outside of top with rootMargin ${rootMargin}`);
      }
    };

    const observer = new IntersectionObserver(callback, {
      root: rootRef?.current ?? null,
      rootMargin,
      threshold: [0]
    });

    observer.observe(spyRef.current);
    return () => {
      observer.disconnect();
    };
  }, [name, rootMargin, rootRef]);

  return (
    <div
      style={{ height: "1px", borderBottom: "1px solid papayawhip" }}
      ref={spyRef}
    />
  );
}

function ScrollSentinel({ onView, onUnview, offset, containerRef, ...rest }) {
  const sentinelRef = useRef(null);
  const isInView = useRef(false);

  useEffect(() => {
    const currentSentinel = sentinelRef.current;

    if (!currentSentinel || (containerRef && !containerRef.current)) {
      return;
    }

    const observerCallback = (entries) => {
      const { isIntersecting } = entries[0];
      if (isIntersecting && !isInView.current) {
        isInView.current = true;
        onView();
      }

      if (!isIntersecting && isInView.current) {
        isInView.current = false;
        onUnview();
      }
    };

    const observerCurrent = new IntersectionObserver(observerCallback, {
      root: containerRef?.current ?? undefined
    });

    observerCurrent.observe(currentSentinel);
    return () => {
      observerCurrent.unobserve(currentSentinel);
    };
  });

  return <div {...rest} ref={sentinelRef} />;
}

function Toolbar() {
  const { ref, style, isSticky, setIsSticky } = useSticky("toolbar");

  return (
    <>
      <ScrollSpy name="toolbar" />
      <div
        ref={ref}
        style={{
          ...style,
          borderBottom: isSticky ? "1px solid red" : "1px solid transparent"
        }}
      >
        <div
          style={{
            padding: "12px 0",
            display: "flex",
            justifyContent: "space-between"
          }}
        >
          <button>Left button</button>
          <button>Right button</button>
        </div>
      </div>
    </>
  );
}

function NestedOuter({ id }) {
  const outerId = `nested-outer-${id}`;
  const { ref, style } = useSticky(outerId, ["toolbar"]);

  return (
    <div>
      <div ref={ref} style={style}>
        <h3>Headline</h3>
      </div>
      <p>
        Jack Daniels on stage. Def Leppard. Take me down to the paradise city.
        Ozzy Osbourne Bites the Head Off a Bat. I wanna rock and roll all night
        and part of every day. You're the only one I wanna touch. I'm the man on
        the silver mountain. Rob Zombie's Living Dead Girl.
      </p>
      <NestedInner
        outerId={outerId}
        headline="Subheadline 1"
        text="GWAR. Headbanger's Ball on MTV. Les Paul with a Marshall stack Greta Van
        Fleet. AC/DC. Michael Schenker from UFO and his Flying V. Feed my
        Frankenstein, Hungry for love, and it's feeding time Savatage morphed
        into the Trans-Siberian Orchestra. Les Paul with a Marshall stack"
      />
      <NestedInner
        outerId={outerId}
        headline="Subheadline 2"
        text="Bullet Boys - Smooth up in ya. Jack Daniels on stage. Les Paul with a
        Marshall stack Where is Tommy Lee's MAYHEM tattoo? Ace of Spades. Home
        sweet home. Lamb of God. Sister Christian. Stewart Stevenson from Beavis
        and Butt-head. 'Wait, just a moment before our love will die', sings
        Mike Tramp of White Lion."
      />
    </div>
  );
}

function NestedInner({ headline, text, outerId }) {
  const { ref, style } = useSticky("nested-inner", ["toolbar", outerId]);

  return (
    <>
      <div ref={ref} style={style}>
        <h4>{headline}</h4>
      </div>
      <p>{text}</p>
    </>
  );
}

function Table({ name }) {
  const rows = [
    ["foo", "bar", "baz"],
    ["foo", "bar", "baz"],
    ["foo", "bar", "baz"],
    ["foo", "bar", "baz"],
    ["foo", "bar", "baz"],
    ["foo", "bar", "baz"],
    ["foo", "bar", "baz"],
    ["foo", "bar", "baz"],
    ["foo", "bar", "baz"]
  ];

  const rowStyle = {
    display: "grid",
    width: "100%",
    gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)",
    borderBottom: "1px solid #E0E6F0"
  };

  const cellStyle = {
    padding: "8px 0"
  };

  const { ref, style, offset, isSticky, setIsSticky } = useSticky("tablehead", [
    "toolbar"
  ]);

  return (
    <div role="table">
      <ScrollSpy name={name} rootMargin={`-40px 0px 0px 0px`} />
      {/* <ScrollSentinel
        onView={() => setIsSticky(false)}
        onUnview={() => setIsSticky(true)}
        offset={offset}
      /> */}
      <div
        role="rowgroup"
        ref={ref}
        style={{
          ...style,
          borderBottom: isSticky ? "1px solid blue" : "1px solid transparent"
        }}
      >
        <div role="row" style={rowStyle}>
          <span role="columnheader" style={cellStyle}>
            Column A
          </span>
          <span role="columnheader" style={cellStyle}>
            Column B
          </span>
          <span role="columnheader" style={cellStyle}>
            Column C
          </span>
        </div>
      </div>
      <div role="rowgroup">
        {rows.map((row, i) => (
          <div role="row" key={i} style={rowStyle}>
            {row.map((cell, j) => (
              <span key={j} role="cell" style={cellStyle}>
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StickyContextProvider>
      <h1
        style={{
          display: "block",
          background: "#fafafa",
          margin: 0,
          padding: "16px 0"
        }}
      >
        Toolbar above Table
      </h1>
      <Toolbar />
      <NestedOuter id="1" />
      <Table name="table 1" />
      <NestedOuter id="2" />
      <Table name="table 2" />
      <NestedOuter id="3" />
      <div style={{ height: "1000px" }} />
    </StickyContextProvider>
  );
}
