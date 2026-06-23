import Lottie from "lottie-react";
import animation from "../assets/animations/water.json";
import styled from "styled-components";
import { useEffect, useRef, useState } from "react";

interface PropTypes {
  height?: string | number;
  width?: string | number;
}

/** Function holding the Loading Screen Component. */
const Loading = (props: PropTypes) => {
  const lottieRef = useRef<any>(null);
  const [speed] = useState(5);

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(speed);
    }
  }, [speed]);

  return (
    <View
      style={{
        [props.height ? "maxHeight" : "minHeight"]: props.height
          ? props.height
          : "100vh",
      }}
    >
      <Lottie
        style={{ width: props.width ? props.width : "20%" }}
        animationData={animation}
        lottieRef={lottieRef}
        loop={true}
      />
    </View>
  );
};

export default Loading;

const View = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
`;
