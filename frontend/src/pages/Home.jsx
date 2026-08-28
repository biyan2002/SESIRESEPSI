import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Packages from "@/components/Packages";
import About from "@/components/About";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import Testimonials from "@/components/Testimonials";
import BookingForm from "@/components/BookingForm";
import Footer from "@/components/Footer";
import WhatsAppPopup from "@/components/WhatsAppPopup";
import AnimatedFlowers from "@/components/AnimatedFlowers";
import GlassNavigation from "@/components/GlassNavigation";

const Home = () => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const bookingRef = useRef(null);

  const handleBook = (pkg) => {
    setSelectedPackage(pkg);
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-pink-100 overflow-hidden">
      <GlassNavigation />
      <Hero />
      <Marquee />

      <div className="relative">
        <AnimatedFlowers />
        <Packages onBook={handleBook} />
      </div>

      <About />

      <div className="relative bg-gradient-to-b from-transparent via-pink-100/60 to-transparent">
        <AnimatedFlowers />
        <AvailabilityCalendar />
      </div>

      <section
        ref={bookingRef}
        id="booking-section"
        className="scroll-section relative px-4 py-16 sm:px-6 sm:py-24"
        data-testid="booking-section"
      >
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-xs tracking-[0.3em] uppercase text-rose-600 font-semibold mb-3">
              ✧ Yuk Booking ✧
            </p>
            <h2 className="font-serif-display text-4xl md:text-5xl text-rose-950">
              Amankan tanggalmu <span className="italic text-rose-600">sekarang</span>
            </h2>
          </motion.div>
          <BookingForm selectedPackage={selectedPackage} />
        </div>
      </section>

      <Testimonials />
      <Footer />
      <WhatsAppPopup />
    </div>
  );
};

export default Home;
