import { motion } from "framer-motion";

const animations = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const AnimatedPage = ({ children }) => {
  return (
    <motion.div
      variants={animations}
      initial="initial"
      animate="animate"
      exit="exit"
      // Faster duration for better performance
      transition={{ duration: 0.25, ease: "easeOut" }}
      // GPU acceleration
      style={{ transform: "translateZ(0)" }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;
