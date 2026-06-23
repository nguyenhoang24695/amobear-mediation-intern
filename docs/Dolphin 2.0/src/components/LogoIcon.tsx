import Lottie from "lottie-react";
import animation from "../assets/animations/water.json";
import styled from "styled-components";
import { useEffect, useRef, useState } from "react";

const LogoIcon = () => {
  const lottieRef = useRef<any>(null);
  const [speed] = useState<number>(1);

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(speed);
    }
  }, [speed]);

  return (
    <View style={{ width: 50, height: 50 }}>
      <Lottie
        style={{ width: "100%" }}
        animationData={animation}
        lottieRef={lottieRef}
        loop={true}
      />
    </View>
  );
};

export default LogoIcon;

const View = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;
