import { motion } from "framer-motion";
import { FiCheck } from "react-icons/fi";
import { InlineWidget } from "react-calendly";

const features = [
  "Unlimited hosts monitoring",
  "AI-powered root cause analysis",
  "Real-time event streaming",
  "Auto-remediation workflows",
  "Enterprise RBAC & SSO",
  "24/7 Priority support",
  "White-label options",
  "99.99% SLA guarantee"
];

const Pricing = () => {
  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="text-foreground">Enterprise </span>
            <span className="bg-gradient-to-r from-[#00f0ff] to-[#d900ff] bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            One plan, unlimited possibilities
          </p>
        </motion.div>

        {/* Pricing card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card p-12 rounded-3xl border-2 border-[#00f0ff]/50 relative overflow-hidden"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/10 via-[#d900ff]/10 to-[#ff006e]/10 animate-gradient-shift" />
          
          {/* Popular badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-[#00f0ff] to-[#d900ff] rounded-full text-background font-bold text-sm"
          >
            MOST POPULAR
          </motion.div>

          <div className="relative z-10">
            {/* Price */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-[#00f0ff] to-[#d900ff] bg-clip-text text-transparent">
                  $799
                </span>
                <div className="text-left">
                  <p className="text-muted-foreground text-lg">/month</p>
                  <p className="text-sm text-muted-foreground">billed annually</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-2">or $999/month billed monthly</p>
              <p className="text-2xl font-bold text-[#39ff14]">
                Cheaper than one outage per year
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {features.map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#39ff14] to-[#00f0ff] flex items-center justify-center flex-shrink-0">
                    <FiCheck className="w-4 h-4 text-background" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Calendly Integration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 glass-card rounded-3xl p-8 border-2 border-secondary/30"
        >
          <h3 className="text-3xl font-bold text-center mb-8">
            <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              Book Your 15-Minute Demo
            </span>
          </h3>
          <div className="rounded-2xl overflow-hidden">
            <InlineWidget
              url="https://calendly.com/nebulaguard/demo"
              styles={{ height: "700px", minWidth: "320px" }}
            />
          </div>
        </motion.div>

        {/* Value propositions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 grid md:grid-cols-3 gap-6"
        >
          {[
            { title: "ROI Guarantee", desc: "See positive ROI in 30 days or get a full refund" },
            { title: "Free Migration", desc: "Our team handles the entire migration process" },
            { title: "Cancel Anytime", desc: "No contracts, no commitments, cancel with one click" }
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="glass-surface p-6 rounded-2xl border border-border/30 text-center"
            >
              <h4 className="text-lg font-bold text-primary mb-2">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
