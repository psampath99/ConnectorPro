import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SingleScreenOnboarding } from '@/components/onboarding/SingleScreenOnboarding';
import { storage } from '@/lib/storage';
import { 
  Network, 
  Sun, 
  Moon, 
  Target, 
  Users, 
  Briefcase, 
  TrendingUp,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';

// Three.js types
declare global {
  interface Window {
    THREE: any;
  }
}

interface NetworkVisualizationProps {
  containerId: string;
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({ containerId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const nodesRef = useRef<any[]>([]);
  const connectionsRef = useRef<any[]>([]);

  useEffect(() => {
    // Load Three.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      initVisualization();
    };
    document.head.appendChild(script);

    return () => {
      cleanup();
      document.head.removeChild(script);
    };
  }, []);

  const initVisualization = () => {
    if (!containerRef.current || !window.THREE) return;

    const THREE = window.THREE;
    const container = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      container.offsetWidth / container.offsetHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Create network
    createNetwork(THREE, scene);
    
    // Start animation
    animate(THREE, scene, camera, renderer);

    // Handle resize
    const handleResize = () => {
      if (container && camera && renderer) {
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
  };

  const createNetwork = (THREE: any, scene: any) => {
    const nodeGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    
    // Central node
    const centralNode = new THREE.Mesh(nodeGeometry, new THREE.MeshBasicMaterial({ color: 0x8b5cf6 }));
    centralNode.scale.setScalar(1.5);
    scene.add(centralNode);
    nodesRef.current.push({ mesh: centralNode, angle: 0, radius: 0, speed: 0 });

    // Surrounding nodes
    for (let i = 0; i < 12; i++) {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      const angle = (i / 12) * Math.PI * 2;
      const radius = 1 + Math.random() * 1.5;
      
      node.position.x = Math.cos(angle) * radius;
      node.position.y = Math.sin(angle) * radius;
      node.position.z = (Math.random() - 0.5) * 0.5;
      
      scene.add(node);
      nodesRef.current.push({
        mesh: node,
        angle: angle,
        radius: radius,
        speed: 0.001 + Math.random() * 0.002
      });

      // Connections to central node
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(node.position.x, node.position.y, node.position.z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ 
        color: 0x3b82f6, 
        opacity: 0.3, 
        transparent: true 
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      connectionsRef.current.push(line);
    }

    // Inter-node connections
    for (let i = 0; i < 6; i++) {
      const node1 = nodesRef.current[1 + Math.floor(Math.random() * (nodesRef.current.length - 1))];
      const node2 = nodesRef.current[1 + Math.floor(Math.random() * (nodesRef.current.length - 1))];
      
      if (node1 !== node2) {
        const points = [
          node1.mesh.position.clone(),
          node2.mesh.position.clone()
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
          color: 0x64748b, 
          opacity: 0.2, 
          transparent: true 
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        connectionsRef.current.push(line);
      }
    }
  };

  const animate = (THREE: any, scene: any, camera: any, renderer: any) => {
    const animateFrame = () => {
      animationIdRef.current = requestAnimationFrame(animateFrame);

      // Animate nodes
      nodesRef.current.forEach((nodeData, index) => {
        if (index === 0) return; // Skip central node
        
        nodeData.angle += nodeData.speed;
        nodeData.mesh.position.x = Math.cos(nodeData.angle) * nodeData.radius;
        nodeData.mesh.position.y = Math.sin(nodeData.angle) * nodeData.radius;
        nodeData.mesh.position.z = Math.sin(nodeData.angle * 2) * 0.2;
      });

      // Update connections
      connectionsRef.current.forEach((connection, index) => {
        if (index < nodesRef.current.length - 1) {
          const points = [
            new THREE.Vector3(0, 0, 0),
            nodesRef.current[index + 1].mesh.position.clone()
          ];
          connection.geometry.setFromPoints(points);
        }
      });

      // Rotate scene
      scene.rotation.z += 0.001;

      renderer.render(scene, camera);
    };

    animateFrame();
  };

  const cleanup = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    if (rendererRef.current && containerRef.current) {
      containerRef.current.removeChild(rendererRef.current.domElement);
    }
  };

  return <div ref={containerRef} className="w-full h-full" />;
};

const LandingPage: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    persona: '',
    goal: '',
    fullName: '',
    email: '',
    currentRole: '',
    company: '',
    targetCompanies: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('connectorpro_theme') as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Check if user is returning
    const userData = localStorage.getItem('connectorpro_user');
    const onboardingComplete = localStorage.getItem('connectorpro_onboarding_complete');
    
    if (userData && onboardingComplete) {
      // Returning user - could redirect to dashboard or show different CTA
      console.log('Returning user detected');
    }
  }, []);

  useEffect(() => {
    // Intersection Observer for animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('connectorpro_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleGetStarted = () => {
    const userData = localStorage.getItem('connectorpro_user');
    const onboardingComplete = localStorage.getItem('connectorpro_onboarding_complete');
    
    if (userData && onboardingComplete) {
      // Returning user - go to dashboard
      navigate('/dashboard');
    } else {
      // New user - show onboarding
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = (userData: any) => {
    console.log('Onboarding completed:', userData);
    setShowOnboarding(false);
    navigate('/dashboard');
  };

  const personas = [
    { id: 'job_seeker', title: 'Job Seeker', icon: '🎯', description: 'Find opportunities through strategic networking' },
    { id: 'sales_rep', title: 'Sales', icon: '💼', description: 'Accelerate sales through warm introductions' },
    { id: 'consultant', title: 'Consultant', icon: '🧠', description: 'Expand client base through referrals' },
    { id: 'other', title: 'Other', icon: '👤', description: 'Other professional networking needs' }
  ];

  const goals = [
    { id: 'find-job', label: 'Find a new job opportunity' },
    { id: 'generate-leads', label: 'Generate more sales leads' },
    { id: 'expand-network', label: 'Expand professional network' },
    { id: 'get-referrals', label: 'Get more referrals' },
    { id: 'other', label: 'Other' }
  ];

  if (showOnboarding) {
    return <SingleScreenOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      theme === 'dark' 
        ? 'bg-slate-900 text-slate-100' 
        : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Animated gradient background */}
      <div className={`fixed inset-0 opacity-5 ${
        theme === 'dark' ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-gradient-to-br from-blue-400 to-purple-400'
      } animate-pulse`} />

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-slate-900/80 border-slate-700' 
          : 'bg-white/80 border-slate-200'
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">ConnectorPro</span>
          </div>
          
          <button
            onClick={toggleTheme}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
              theme === 'dark' 
                ? 'bg-slate-800 hover:bg-slate-700' 
                : 'bg-white hover:bg-slate-100'
            } shadow-lg`}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 px-6 text-center animate-on-scroll">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Unlock Your Network's Potential
            </h1>
            <p className={`text-xl mb-8 max-w-2xl mx-auto ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Transform your professional relationships into strategic advantages with AI-powered insights and seamless integration.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Get Started – It's Free
            </Button>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 animate-on-scroll">Powerful Features</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Large feature card */}
              <Card className={`md:col-span-2 p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl animate-on-scroll ${
                theme === 'dark' 
                  ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' 
                  : 'bg-white/50 border-slate-200 backdrop-blur-sm'
              }`}>
                <div className="border-t-4 border-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg -mt-8 -mx-8 mb-6 h-1 bg-gradient-to-r from-blue-500 to-purple-600" />
                <CardContent className="p-0">
                  <h3 className="text-2xl font-semibold mb-4">AI-Powered Pathway Discovery</h3>
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                    Our advanced AI analyzes your network to identify the most effective pathways to your target connections. 
                    Discover hidden relationships and warm introductions that can accelerate your professional goals.
                  </p>
                </CardContent>
              </Card>

              {/* Smaller feature cards */}
              {[
                { title: 'Job Seekers', description: 'Find your next opportunity through strategic networking. Identify decision-makers and get warm introductions to hiring managers.', icon: Briefcase },
                { title: 'Sales', description: 'Accelerate your sales cycle by leveraging existing relationships to reach prospects and build trust faster.', icon: Target },
                { title: 'Consultants', description: 'Expand your client base through strategic referrals and maintain stronger relationships with existing clients.', icon: TrendingUp },
                { title: 'CRM Integration', description: 'Seamlessly sync with your existing tools. Import from LinkedIn, Gmail, and popular CRM platforms.', icon: Users }
              ].map((feature, index) => (
                <Card key={index} className={`p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl animate-on-scroll ${
                  theme === 'dark' 
                    ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' 
                    : 'bg-white/50 border-slate-200 backdrop-blur-sm'
                }`}>
                  <div className="border-t-4 border-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg -mt-6 -mx-6 mb-4 h-1 bg-gradient-to-r from-blue-500 to-purple-600" />
                  <CardContent className="p-0">
                    <div className="flex items-center mb-3">
                      <feature.icon className="w-6 h-6 text-blue-500 mr-2" />
                      <h3 className="text-lg font-semibold">{feature.title}</h3>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Tagline Section */}
        <section className={`py-16 px-6 mx-6 rounded-2xl backdrop-blur-md animate-on-scroll ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border border-slate-700' 
            : 'bg-white/30 border border-slate-200'
        }`}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold">
              Stay organized, stay ahead — every email, call, and meeting in a single view.
            </h2>
          </div>
        </section>

        {/* Interactive Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-on-scroll">
              <h2 className="text-3xl font-bold mb-6">Visualize Your Advantage</h2>
              <p className={`text-lg leading-relaxed ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              }`}>
                See your network come to life with our interactive visualization. Understand connection strengths, 
                identify key influencers, and discover the shortest paths to your goals. Our dynamic network map 
                updates in real-time as you build and strengthen relationships.
              </p>
            </div>
            
            <div className="h-96 rounded-2xl overflow-hidden animate-on-scroll">
              <NetworkVisualization containerId="network-viz" />
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 animate-on-scroll">What Our Users Say</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  quote: "ConnectorPro helped me land my dream job by showing me exactly who to reach out to. The AI recommendations were spot-on!",
                  author: "Sarah Chen",
                  role: "Software Engineer"
                },
                {
                  quote: "My sales conversion rate increased by 40% after using ConnectorPro to identify warm introduction paths to prospects.",
                  author: "Marcus Rodriguez", 
                  role: "Sales Director"
                },
                {
                  quote: "As a consultant, ConnectorPro has become essential for maintaining and growing my professional network. The insights are invaluable.",
                  author: "Dr. Emily Watson",
                  role: "Management Consultant"
                }
              ].map((testimonial, index) => (
                <Card key={index} className={`p-6 text-center transition-all duration-300 hover:scale-105 animate-on-scroll ${
                  theme === 'dark' 
                    ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' 
                    : 'bg-white/50 border-slate-200 backdrop-blur-sm'
                }`}>
                  <CardContent className="p-0">
                    <p className={`text-lg italic mb-6 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      "{testimonial.quote}"
                    </p>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {testimonial.role}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`py-8 px-6 text-center border-t ${
        theme === 'dark' ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
      }`}>
        <div className="max-w-6xl mx-auto">
          <p>&copy; 2025 ConnectorPro. All rights reserved.</p>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s ease;
          }
          
          .animate-on-scroll.animate-in {
            opacity: 1;
            transform: translateY(0);
          }
          
          [data-theme="dark"] {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --text-primary: #e2e8f0;
            --text-secondary: #94a3b8;
          }
          
          [data-theme="light"] {
            --bg-primary: #f1f5f9;
            --bg-secondary: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
          }
        `
      }} />
    </div>
  );
};

export default LandingPage;