import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { World } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import jdeLogo from '@/assets/JDE.png';
import jdmoLogo from '@/assets/JDMO.png';
import dbcsLogo from '@/assets/DBCS.png';

interface WorldCard3DProps {
  world: World;
}

const WorldCard3D = ({ world }: WorldCard3DProps) => {
  const navigate = useNavigate();
  
  // Mapping des couleurs par code de monde
  const colorMap: Record<string, { primary: string; accent: string }> = {
    JDE: { 
      primary: 'hsl(0, 85%, 58%)',     // Rouge
      accent: 'hsl(0, 70%, 45%)'
    },
    JDMO: { 
      primary: 'hsl(25, 95%, 60%)',    // Orange
      accent: 'hsl(25, 80%, 50%)'
    },
    DBCS: { 
      primary: 'hsl(145, 65%, 48%)',   // Vert
      accent: 'hsl(145, 50%, 40%)'
    },
  };
  
  // Mapping des couleurs de fond pastel
  const backgroundColorMap: Record<string, string> = {
    JDE: 'hsl(0, 70%, 92%)',      // Rose pâle
    JDMO: 'hsl(25, 80%, 90%)',    // Pêche/Saumon clair
    DBCS: 'hsl(145, 50%, 90%)',   // Vert menthe clair
  };
  
  const colors = colorMap[world.code] || world.theme_colors;
  const backgroundColor = backgroundColorMap[world.code] || 'hsl(0, 0%, 95%)';

  const handleClick = () => {
    navigate(`/${world.code.toLowerCase()}/dossiers`);
  };

  const logoMap: Record<string, string> = {
    JDE: jdeLogo,
    JDMO: jdmoLogo,
    DBCS: dbcsLogo,
  };

  return (
    <motion.div
      className="perspective-1000"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      <motion.div
        whileHover={{
          rotateY: 2,
          rotateX: -2,
        }}
        transition={{ 
          duration: 0.3,
          type: "spring",
          stiffness: 150,
          damping: 20
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        <Card
          className="relative overflow-hidden shadow-md hover:shadow-vuexy-xl transition-slow cursor-pointer"
          onClick={handleClick}
          style={{
            backgroundColor: backgroundColor,
            borderColor: 'hsl(var(--border))',
            borderWidth: '1px',
            borderRadius: '1.5rem',
          }}
        >
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <img 
                src={logoMap[world.code]} 
                alt={`${world.name} logo`}
                className="h-24 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }}
              />
              <h3 className="text-2xl font-bold text-center" style={{ color: colors.primary }}>
                {world.name}
              </h3>
            </div>

            <div className="pt-2">
              <Button
                className="w-full group relative overflow-hidden text-white transition-all duration-300"
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: '0.875rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(0.85)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  Entrer dans le Monde
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-all duration-300" />
                </span>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default WorldCard3D;
