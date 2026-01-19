import { useEffect, useState } from 'react';
import { adminAPI } from '@/integrations/laravel/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Search, Plus, Mail, Phone, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import CreateClientDialog from '@/components/client/CreateClientDialog';
import EditClientDialog from '@/components/client/EditClientDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface World {
  id: string;
  code: string;
  name: string;
}

interface ClientInfo {
  id: string;
  dossier_id: string | null;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  client_type: string;
  adresse_client: string | null;
  adresse_sinistre: string | null;
  type_sinistre: string | null;
  date_sinistre: string | null;
  compagnie_assurance: string | null;
  numero_police: string | null;
  montant_dommage_batiment: number | null;
  created_at: string;
  world?: World; // World where client was created
}

const ClientsManagement = () => {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [worldFilter, setWorldFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchQuery, worldFilter, clients]);

  const fetchClients = async () => {
    try {
      setLoading(true);

      // Fetch clients from Laravel API using adminAPI
      const data = await adminAPI.getClients();
      console.log('Raw API response:', data);
      console.log('Clients array:', data.clients?.data || data.clients || []);
      const clientsArray = data.clients?.data || data.clients || [];
      console.log('First client world data:', clientsArray[0]?.world);

      setClients(clientsArray);
      setFilteredClients(clientsArray);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erreur lors du chargement des clients');
      setClients([]);
      setFilteredClients([]);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    // Filter by world first
    if (worldFilter !== 'all') {
      // Show only clients from the selected world
      filtered = filtered.filter((client) => {
        const clientWorld = client.world?.code;
        return clientWorld === worldFilter;
      });
    }
    // If worldFilter === 'all', show all clients

    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.nom?.toLowerCase().includes(query) ||
          client.prenom?.toLowerCase().includes(query) ||
          client.email?.toLowerCase().includes(query) ||
          client.telephone?.toLowerCase().includes(query)
      );
    }

    setFilteredClients(filtered);
  };

  const getWorldColor = (code: string) => {
    const colors: Record<string, string> = {
      JDE: 'hsl(0, 85%, 58%)',
      JDMO: 'hsl(25, 95%, 60%)',
      DBCS: 'hsl(145, 65%, 48%)',
    };
    return colors[code] || 'hsl(var(--primary))';
  };

  const getClientTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      locataire: 'Locataire',
      proprietaire: 'Propriétaire',
      proprietaire_non_occupant: 'Propriétaire non occupant',
      professionnel: 'Professionnel',
    };
    return types[type] || type;
  };

  const getClientTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      locataire: 'bg-blue-100 text-blue-700',
      proprietaire: 'bg-green-100 text-green-700',
      proprietaire_non_occupant: 'bg-orange-100 text-orange-700',
      professionnel: 'bg-purple-100 text-purple-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const handleDeleteClient = async () => {
    if (!deletingClientId) return;

    toast.info('Client deletion temporarily disabled during Laravel migration');
    setDeletingClientId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <CreateClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchClients}
      />

      <EditClientDialog
        open={!!editingClientId}
        onOpenChange={(open) => !open && setEditingClientId(null)}
        clientId={editingClientId}
        onSuccess={fetchClients}
      />

      <AlertDialog open={!!deletingClientId} onOpenChange={(open) => !open && setDeletingClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette fiche client ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gestion des Clients</h1>
            <p className="text-muted-foreground">
              {filteredClients.length} fiche{filteredClients.length > 1 ? 's' : ''} client
              {filteredClients.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Créer une fiche client
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* World Filter */}
          <div className="flex gap-2">
            <Button
              variant={worldFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setWorldFilter('all')}
              size="sm"
            >
              Tous les mondes
            </Button>
            <Button
              variant={worldFilter === 'JDE' ? 'default' : 'outline'}
              onClick={() => setWorldFilter('JDE')}
              size="sm"
              className={worldFilter === 'JDE' ? 'text-white' : 'border-red-600 text-red-600 hover:bg-red-50'}
              style={{
                backgroundColor: worldFilter === 'JDE' ? getWorldColor('JDE') : undefined,
              }}
            >
              JDE
            </Button>
            <Button
              variant={worldFilter === 'JDMO' ? 'default' : 'outline'}
              onClick={() => setWorldFilter('JDMO')}
              size="sm"
              className={worldFilter === 'JDMO' ? 'text-white' : 'border-orange-600 text-orange-600 hover:bg-orange-50'}
              style={{
                backgroundColor: worldFilter === 'JDMO' ? getWorldColor('JDMO') : undefined,
              }}
            >
              JDMO
            </Button>
            <Button
              variant={worldFilter === 'DBCS' ? 'default' : 'outline'}
              onClick={() => setWorldFilter('DBCS')}
              size="sm"
              className={worldFilter === 'DBCS' ? 'text-white' : 'border-green-600 text-green-600 hover:bg-green-50'}
              style={{
                backgroundColor: worldFilter === 'DBCS' ? getWorldColor('DBCS') : undefined,
              }}
            >
              DBCS
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, prénom, email ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucune fiche client trouvée</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Essayez avec un autre terme de recherche'
                : 'Commencez par créer votre première fiche client'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une fiche client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                  <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CardTitle className="text-xl">
                        {client.nom} {client.prenom}
                      </CardTitle>
                      {/* World badges - TODO: Implement when world associations are set up */}
                      {/* <Badge variant="secondary">WORLD</Badge> */}
                    </div>
                    <Badge className={`${getClientTypeColor(client.client_type)}`}>
                      {getClientTypeLabel(client.client_type)}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingClientId(client.id)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingClientId(client.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Email */}
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`mailto:${client.email}`}
                      className="text-primary hover:underline truncate"
                    >
                      {client.email}
                    </a>
                  </div>
                )}

                {/* Téléphone */}
                {client.telephone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`tel:${client.telephone}`}
                      className="text-primary hover:underline"
                    >
                      {client.telephone}
                    </a>
                  </div>
                )}

                {/* Adresse */}
                {client.adresse_client && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground line-clamp-2">
                      {client.adresse_client}
                    </span>
                  </div>
                )}

                {/* Sinistre info */}
                {client.type_sinistre && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Sinistre
                    </p>
                    <p className="text-sm">{client.type_sinistre}</p>
                    {client.date_sinistre && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(client.date_sinistre), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                )}

                {/* Montant */}
                {client.montant_dommage_batiment && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Montant dommage
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {client.montant_dommage_batiment.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </p>
                  </div>
                )}

                {/* Date création */}
                <div className="pt-3 border-t text-xs text-muted-foreground">
                  Créé le {format(new Date(client.created_at), 'dd MMM yyyy', { locale: fr })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientsManagement;
