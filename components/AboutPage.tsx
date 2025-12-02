/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Award, Briefcase, GraduationCap, Heart, Coffee, Zap, ArrowRight, Quote, CheckCircle } from 'lucide-react';

interface AboutPageProps {
  onNavigate: (page: 'contact' | 'services' | 'portfolio') => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'story' | 'skills' | 'values'>('story');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const skills = [
    { name: 'Brand Identity Design', level: 95 },
    { name: 'Social Media Graphics', level: 98 },
    { name: 'Web Design', level: 90 },
    { name: 'Print Design', level: 92 },
    { name: 'Motion Graphics', level: 85 },
    { name: 'UI/UX Design', level: 88 },
  ];

  const timeline = [
    {
      year: '2016',
      title: 'Started My Journey',
      description: 'Began freelancing while studying design, working with local businesses.',
      icon: GraduationCap,
    },
    {
      year: '2018',
      title: 'First Major Client',
      description: 'Landed my first enterprise client, designing their complete brand identity.',
      icon: Briefcase,
    },
    {
      year: '2020',
      title: 'Award Recognition',
      description: 'Won multiple design awards for innovative social media campaigns.',
      icon: Award,
    },
    {
      year: '2023',
      title: 'AI-Powered Studio',
      description: 'Integrated AI tools to deliver faster, more creative solutions.',
      icon: Zap,
    },
  ];

  const values = [
    {
      icon: Heart,
      title: 'Passion-Driven',
      description: 'Every project receives my full creative energy and dedication.',
    },
    {
      icon: Coffee,
      title: 'Detail-Oriented',
      description: 'Pixel-perfect designs that stand out in every medium.',
    },
    {
      icon: Zap,
      title: 'Innovation First',
      description: 'Constantly exploring new techniques and technologies.',
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image Side */}
          <div 
            className={`relative transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}
          >
            <div className="relative">
              {/* Main Image Container */}
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10">
                {/* Placeholder for profile image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6">
                      <span className="text-8xl font-bold text-white font-serif">M</span>
                    </div>
                    <p className="text-slate-400 text-sm">Mike Eckmeyer</p>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                  <span className="text-sm font-medium text-white">8+ Years Experience</span>
                </div>
              </div>

              {/* Floating Card */}
              <div className="absolute -bottom-6 -right-6 p-6 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-w-[280px]">
                <Quote className="w-8 h-8 text-violet-400 mb-3" />
                <p className="text-slate-300 text-sm italic leading-relaxed">
                  "Design is not just what it looks like. Design is how it works."
                </p>
                <p className="text-slate-500 text-xs mt-2">— My Design Philosophy</p>
              </div>

              {/* Background Decoration */}
              <div className="absolute -z-10 -top-10 -left-10 w-72 h-72 bg-violet-500/20 rounded-full blur-[100px]" />
            </div>
          </div>

          {/* Content Side */}
          <div 
            className={`transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-violet-300">About Me</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Crafting Visual Stories That
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400"> Inspire Action</span>
            </h1>

            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              I'm Mike Eckmeyer, a passionate graphic designer based in Toronto. For over 8 years, 
              I've been helping small and medium-sized businesses transform their ideas into 
              compelling visual narratives that resonate with their audiences.
            </p>

            <p className="text-slate-400 mb-8 leading-relaxed">
              My approach combines creative intuition with data-driven insights, ensuring every 
              design not only looks stunning but also achieves measurable results. From brand 
              identities to social media campaigns, I bring the same level of dedication and 
              attention to detail to every project.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => onNavigate('contact')}
                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 flex items-center gap-2"
              >
                Work With Me
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('portfolio')}
                className="px-6 py-3 bg-white/5 border border-white/20 text-white rounded-full font-semibold hover:bg-white/10 transition-all duration-300"
              >
                View Portfolio
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <div className="flex justify-center gap-2 mb-12">
          {(['story', 'skills', 'values'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-white text-slate-900'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Story Tab */}
        {activeTab === 'story' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {timeline.map((item, index) => (
              <div
                key={index}
                className="relative p-6 bg-slate-900/50 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all duration-300 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-bold text-white">{item.year}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {skills.map((skill, index) => (
              <div key={index} className="group">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-white">{skill.name}</span>
                  <span className="text-violet-400 font-mono">{skill.level}%</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Values Tab */}
        {activeTab === 'values' && (
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="text-center p-8 bg-slate-900/50 rounded-3xl border border-white/5 hover:border-violet-500/30 transition-all duration-300 group"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <value.icon className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-slate-400">{value.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tools & Technologies */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Tools I Master</h2>
          <p className="text-slate-400">The creative arsenal that powers my designs</p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {[
            'Adobe Photoshop', 'Adobe Illustrator', 'Figma', 'Adobe XD',
            'After Effects', 'Premiere Pro', 'Canva Pro', 'Sketch',
            'InDesign', 'Lightroom', 'Blender', 'Procreate'
          ].map((tool, index) => (
            <div
              key={index}
              className="px-6 py-3 bg-slate-900/50 rounded-full border border-white/10 text-slate-300 font-medium hover:border-violet-500/50 hover:text-white transition-all duration-300 cursor-default"
            >
              {tool}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6">
        <div className="relative p-12 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-3xl border border-white/10 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Create Something Amazing?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Let's collaborate and bring your vision to life with designs that make an impact.
            </p>
            <button
              onClick={() => onNavigate('contact')}
              className="px-8 py-4 bg-white text-slate-900 rounded-full font-semibold hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105"
            >
              Start a Project
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;