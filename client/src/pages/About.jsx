import React from 'react';
import { motion } from 'framer-motion';
import { Users, Target, Award, Globe, Mail, Phone, MapPin, Linkedin, Twitter } from 'lucide-react';

const About = () => {
  const teamMembers = [
    {
      name: "Priya Sharma",
      role: "CEO & Founder",
      image: "/images/team/priya.jpg",
      bio: "Agricultural engineer with 15+ years of experience in supply chain management.",
      linkedin: "#",
      twitter: "#"
    },
    {
      name: "Rajesh Kumar",
      role: "CTO",
      image: "/images/team/rajesh.jpg",
      bio: "Technology leader specializing in IoT and agricultural automation systems.",
      linkedin: "#",
      twitter: "#"
    },
    {
      name: "Meera Patel",
      role: "Head of Operations",
      image: "/images/team/meera.jpg",
      bio: "Logistics expert focused on optimizing rural-urban supply chains.",
      linkedin: "#",
      twitter: "#"
    },
    {
      name: "Arjun Singh",
      role: "Lead Developer",
      image: "/images/team/arjun.jpg",
      bio: "Full-stack developer passionate about creating farmer-friendly technologies.",
      linkedin: "#",
      twitter: "#"
    }
  ];

  const values = [
    {
      icon: Target,
      title: "Farmer-First Approach",
      description: "Every solution we build is designed with farmers' needs at the center, ensuring maximum benefit and ease of use."
    },
    {
      icon: Globe,
      title: "Sustainable Growth",
      description: "We promote environmentally conscious farming practices and sustainable supply chain management."
    },
    {
      icon: Users,
      title: "Community Building",
      description: "Connecting farmers, suppliers, and markets to create stronger agricultural communities."
    },
    {
      icon: Award,
      title: "Innovation Excellence",
      description: "Leveraging cutting-edge technology to solve traditional agricultural challenges."
    }
  ];

  const stats = [
    { number: "10,000+", label: "Farmers Connected" },
    { number: "500+", label: "Transporters Network" },
    { number: "50+", label: "Markets Integrated" },
    { number: "95%", label: "Customer Satisfaction" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">About AgriSync</h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
              Transforming agriculture through technology, connecting farmers to global markets, 
              and building sustainable supply chains for the future.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Company Story */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Founded in 2020, AgriSync emerged from a simple observation: farmers produce 
                  the food that feeds the world, yet they often struggle with inefficient supply 
                  chains, lack of market access, and poor price transparency.
                </p>
                <p>
                  Our founders, coming from agricultural and technology backgrounds, saw an 
                  opportunity to bridge this gap using modern technology. What started as a 
                  small project to help local farmers connect with nearby markets has grown 
                  into a comprehensive platform serving thousands of farmers across the country.
                </p>
                <p>
                  Today, AgriSync is more than just a platform – it's a movement towards 
                  digitizing agriculture, empowering farmers, and creating transparent, 
                  efficient supply chains that benefit everyone from farm to fork.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <img 
                src="/images/about/farming-story.jpg" 
                alt="Agricultural technology in action"
                className="rounded-2xl shadow-2xl w-full h-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div 
                className="hidden w-full h-64 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl items-center justify-center"
              >
                <div className="text-center text-green-700">
                  <Globe className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg font-semibold">Global Agricultural Innovation</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <Target className="h-16 w-16 text-green-600 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-gray-700 leading-relaxed">
                To empower farmers with technology-driven solutions that streamline supply chains, 
                improve market access, and increase profitability while promoting sustainable 
                agricultural practices.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <Globe className="h-16 w-16 text-green-600 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-gray-700 leading-relaxed">
                To create a world where every farmer has access to fair markets, efficient 
                logistics, and the tools they need to thrive in an increasingly connected 
                global agricultural ecosystem.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Impact by the Numbers
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform's reach and impact continue to grow as we connect more farmers 
              with opportunities and technology.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-green-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-700 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do and every decision we make.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <value.icon className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-700 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Passionate professionals dedicated to revolutionizing agriculture through technology.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow text-center"
              >
                <div className="relative mb-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-24 h-24 rounded-full mx-auto object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div 
                    className="hidden w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-green-400 to-green-600 items-center justify-center"
                  >
                    <Users className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-green-600 font-medium mb-3">{member.role}</p>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">{member.bio}</p>
                <div className="flex justify-center space-x-3">
                  <a href={member.linkedin} className="text-gray-400 hover:text-blue-600">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href={member.twitter} className="text-gray-400 hover:text-blue-400">
                    <Twitter className="h-5 w-5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 bg-gradient-to-br from-green-600 to-green-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get in Touch</h2>
            <p className="text-xl text-green-100">
              Ready to transform your agricultural operations? We'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Email Us</h3>
              <p className="text-green-100 mb-2">info@agrisync.com</p>
              <p className="text-green-100">support@agrisync.com</p>
            </div>
            <div className="text-center">
              <Phone className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Call Us</h3>
              <p className="text-green-100 mb-2">+91 98765 43210</p>
              <p className="text-green-100">+91 87654 32109</p>
            </div>
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Visit Us</h3>
              <p className="text-green-100 mb-2">AgriSync Technologies Pvt. Ltd.</p>
              <p className="text-green-100">Plot 123, Sector 18</p>
              <p className="text-green-100">Gurgaon, Haryana 122015</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <a
              href="mailto:info@agrisync.com"
              className="inline-block bg-white text-green-800 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-green-50 transition-colors"
            >
              Contact Us Today
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
