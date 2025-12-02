/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Palette, Layout, PenTool, Share2, Video, Globe, 
  Package, Megaphone, ArrowRight, Check, Sparkles,
  MousePointer, Layers, Image, FileText, Zap
} from 'lucide-react';

interface ServicesPageProps {
  onNavigate: (page: 'contact' | 'portfolio') => void;
}

const ServicesPage: React.FC<ServicesPageProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredService, setHoveredService] = useState<number | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const services = [
    {
      icon: Palette,
      title: 'Brand Identity Design',
      description: 'Complete brand identity systems including logos, color palettes, typography, and brand guidelines that tell your unique story.',
      features: ['Logo Design', 'Brand Guidelines', 'Color Systems', 'Typography'],
      color: 'violet',
      price: 'From $2,500',
    },
    {
      icon: Share2,
      title: 'Social Media Graphics',
      description: 'Eye-catching social media content that stops the scroll and drives engagement across all platforms.',
      features: ['Post Templates', 'Story Designs', 'Cover Images', 'Ad Creatives'],
      color: 'fuchsia',
      price: 'From $500/mo',
    },
    {
      icon: Globe,
      title: 'Website Design',
      description: 'Modern, responsive website designs that convert visitors into customers with stunning visuals and intuitive UX.',
      features: ['UI/UX Design', 'Responsive Layouts', 'Prototyping', 'Design Systems'],
      color: 'cyan',
      price: 'From $3,500',
    },
    {
      icon: Package,
      title: 'Packaging Design',
      description: 'Product packaging that stands out on shelves and creates memorable unboxing experiences.',
      features: ['Box Design', 'Label Design', 'Mockups', 'Print-Ready Files'],
      color: 'emerald',
      price: 'From $1,500',
    },
    {
      icon: Megaphone,
      title: 'Marketing Materials',
      description: 'Professional marketing collateral that communicates your message effectively across all touchpoints.',
      features: ['Brochures', 'Flyers', 'Business Cards', 'Presentations'],
      color: 'amber',
      price: 'From $800',
    },
    {
      icon: Video,
      title: 'Motion Graphics',
      description: 'Animated content that brings your brand to life with engaging motion design and video graphics.',
      features: ['Logo Animation', 'Social Videos', 'Explainer Graphics', 'GIFs'],
      color: 'rose',
      price: 'From $1,200',
    },
  ];

  const process = [
    {
      step: '01',
      title: 'Discovery',
      description: 'We start with a deep dive into your brand, goals, and target audience to understand your unique needs.',
      icon: MousePointer,
    },
    {
      step: '02',
      title: 'Strategy',
      description: 'I develop a creative strategy that aligns with your business objectives and resonates with your audience.',
      icon: Layers,
    },
    {
      step: '03',
      title: 'Design',
      description: 'Bringing concepts to life with multiple design iterations, ensuring every detail is perfect.',
      icon: PenTool,
    },
    {
      step: '04',
      title: 'Delivery',
      description: 'Final files delivered in all formats you need, with ongoing support for implementation.',
      icon: Zap,
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
      violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', shadow: 'shadow-violet-500/20' },
      fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', text: 'text-fuchsia-400', shadow: 'shadow-fuchsia-500/20' },
      cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', shadow: 'shadow-cyan-500/20' },
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', shadow: 'shadow-emerald-500/20' },
      amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', shadow: 'shadow-amber-500/20' },
      rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', shadow: 'shadow-rose-500/20' },
    };
    return colors[color] || colors.violet;
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 mb-20 text-center">
        <div 
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">Services & Pricing</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Design Services That
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400"> Drive Results</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
            From brand identity to social media graphics, I offer comprehensive design solutions 
            tailored to help your business stand out and succeed.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto px-6 mb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const colors = getColorClasses(service.color);
            return (
              <div
                key={index}
                className={`relative p-8 bg-slate-900/50 rounded-3xl border border-white/5 transition-all duration-500 cursor-pointer group ${
                  hoveredService === index ? `border-${service.color}-500/30 shadow-2xl ${colors.shadow}` : ''
                }`}
                onMouseEnter={() => setHoveredService(index)}
                onMouseLeave={() => setHoveredService(null)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div className={`w-14 h-14 ${colors.bg} ${colors.border} border rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className={`w-7 h-7 ${colors.text}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">{service.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className={`w-4 h-4 ${colors.text}`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Price */}
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className={`text-lg font-bold ${colors.text}`}>{service.price}</span>
                  <button 
                    onClick={() => onNavigate('contact')}
                    className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Get Started <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Hover Glow */}
                <div className={`absolute inset-0 ${colors.bg} rounded-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10 blur-xl`} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Process Section */}
      <section className="max-w-7xl mx-auto px-6 mb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">My Design Process</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A proven methodology that ensures every project is delivered on time, on budget, and exceeds expectations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {process.map((item, index) => (
            <div key={index} className="relative group">
              {/* Connector Line */}
              {index < process.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-full h-px bg-gradient-to-r from-violet-500/50 to-transparent" />
              )}

              <div className="relative p-6 bg-slate-900/30 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl font-bold text-violet-500/30">{item.step}</span>
                  <div className="p-2 bg-violet-500/10 rounded-xl">
                    <item.icon className="w-5 h-5 text-violet-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'How long does a typical project take?',
              a: 'Project timelines vary based on scope. A logo design typically takes 2-3 weeks, while a complete brand identity can take 4-6 weeks. I\'ll provide a detailed timeline during our initial consultation.',
            },
            {
              q: 'What\'s included in the pricing?',
              a: 'All prices include initial concepts, revisions, and final files in multiple formats. Brand identity packages also include brand guidelines and usage documentation.',
            },
            {
              q: 'Do you offer rush services?',
              a: 'Yes! Rush projects are available for an additional fee. Contact me to discuss your timeline and I\'ll do my best to accommodate your needs.',
            },
            {
              q: 'What if I need ongoing design support?',
              a: 'I offer monthly retainer packages for businesses that need regular design work. This ensures priority scheduling and discounted rates.',
            },
          ].map((faq, index) => (
            <details
              key={index}
              className="group p-6 bg-slate-900/50 rounded-2xl border border-white/5 hover:border-violet-500/20 transition-all duration-300"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-semibold text-white">{faq.q}</span>
                <span className="text-violet-400 group-open:rotate-45 transition-transform duration-300">+</span>
              </summary>
              <p className="mt-4 text-slate-400 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6">
        <div className="relative p-12 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-3xl border border-white/10 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(236,72,153,0.1),transparent_50%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Elevate Your Brand?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Let's discuss your project and create something extraordinary together.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('contact')}
                className="px-8 py-4 bg-white text-slate-900 rounded-full font-semibold hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                Get a Free Quote
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('portfolio')}
                className="px-8 py-4 bg-white/5 border border-white/20 text-white rounded-full font-semibold hover:bg-white/10 transition-all duration-300"
              >
                View My Work
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;