/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Mail, Phone, MapPin, Send, Clock, Calendar,
  Linkedin, Twitter, Instagram, Dribbble, ArrowRight,
  CheckCircle, Sparkles, MessageSquare
} from 'lucide-react';

interface ContactPageProps {
  onNavigate: (page: 'services') => void;
}

const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    budget: '',
    service: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactInfo = [
    {
      icon: Mail,
      label: 'Email',
      value: 'hello@mikeeckmeyer.com',
      link: 'mailto:hello@mikeeckmeyer.com',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: '+1 (416) 555-0123',
      link: 'tel:+14165550123',
    },
    {
      icon: MapPin,
      label: 'Location',
      value: 'Toronto, Canada',
      link: '#',
    },
    {
      icon: Clock,
      label: 'Response Time',
      value: 'Within 24 hours',
      link: '#',
    },
  ];

  const socialLinks = [
    { icon: Linkedin, label: 'LinkedIn', href: '#', color: 'hover:text-blue-400' },
    { icon: Twitter, label: 'Twitter', href: '#', color: 'hover:text-sky-400' },
    { icon: Instagram, label: 'Instagram', href: '#', color: 'hover:text-pink-400' },
    { icon: Dribbble, label: 'Dribbble', href: '#', color: 'hover:text-rose-400' },
  ];

  const services = [
    'Brand Identity Design',
    'Social Media Graphics',
    'Website Design',
    'Packaging Design',
    'Marketing Materials',
    'Motion Graphics',
    'Other',
  ];

  const budgetRanges = [
    'Under $1,000',
    '$1,000 - $2,500',
    '$2,500 - $5,000',
    '$5,000 - $10,000',
    '$10,000+',
    'Not sure yet',
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 mx-auto mb-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Message Sent!</h1>
          <p className="text-lg text-slate-400 mb-8">
            Thank you for reaching out! I'll get back to you within 24 hours.
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-full font-medium hover:bg-white/20 transition-all"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 mb-16 text-center">
        <div 
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <MessageSquare className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">Get In Touch</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Let's Create Something
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400"> Amazing Together</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Have a project in mind? I'd love to hear about it. Fill out the form below 
            and I'll get back to you within 24 hours.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-5 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Your Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-4 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none"
                    placeholder="John Doe"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-4 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none"
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Company */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Company Name</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-4 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none"
                    placeholder="Your Company"
                  />
                </div>

                {/* Service */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Service Needed *</label>
                  <select
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-4 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Select a service</option>
                    {services.map((service) => (
                      <option key={service} value={service} className="bg-slate-900">{service}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Project Budget</label>
                <select
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Select budget range</option>
                  {budgetRanges.map((range) => (
                    <option key={range} value={range} className="bg-slate-900">{range}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Project Details *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-4 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none resize-none"
                  placeholder="Tell me about your project, goals, and timeline..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Info Sidebar */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Cards */}
            <div className="space-y-4">
              {contactInfo.map((info, index) => (
                <a
                  key={index}
                  href={info.link}
                  className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all duration-300 group"
                >
                  <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300">
                    <info.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{info.label}</p>
                    <p className="text-white font-medium">{info.value}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Social Links */}
            <div className="p-6 bg-slate-900/50 rounded-2xl border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-4">Follow Me</h3>
              <div className="flex gap-3">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    className={`p-3 bg-white/5 rounded-xl text-slate-400 ${social.color} transition-all duration-300 hover:bg-white/10`}
                    title={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Availability Card */}
            <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 font-medium">Currently Available</span>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                I'm currently accepting new projects. Let's discuss how I can help bring your vision to life.
              </p>
              <button
                onClick={() => onNavigate('services')}
                className="text-sm text-emerald-400 font-medium flex items-center gap-1 hover:gap-2 transition-all"
              >
                View Services <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* FAQ Link */}
            <div className="p-6 bg-slate-900/50 rounded-2xl border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-2">Have Questions?</h3>
              <p className="text-slate-400 text-sm mb-4">
                Check out my services page for pricing, process details, and frequently asked questions.
              </p>
              <button
                onClick={() => onNavigate('services')}
                className="text-sm text-violet-400 font-medium flex items-center gap-1 hover:gap-2 transition-all"
              >
                View FAQ <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section (Placeholder) */}
      <section className="max-w-7xl mx-auto px-6 mt-20">
        <div className="relative h-64 md:h-80 bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden">
          {/* Placeholder Map Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }}
            />
          </div>
          
          {/* Location Pin */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-violet-500/20 rounded-full flex items-center justify-center border border-violet-500/30">
                <MapPin className="w-8 h-8 text-violet-400" />
              </div>
              <p className="text-white font-semibold">Toronto, Canada</p>
              <p className="text-slate-500 text-sm">Available for remote work worldwide</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;