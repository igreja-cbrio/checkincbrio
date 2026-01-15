import { useState, useEffect } from 'react';
import { Search, User, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSearchPlanningCenter, PlanningCenterPerson } from '@/hooks/usePlanningCenterSearch';

interface PlanningCenterSearchProps {
  onSelect: (person: PlanningCenterPerson) => void;
  placeholder?: string;
}

export function PlanningCenterSearch({ onSelect, placeholder = "Digite seu nome..." }: PlanningCenterSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: people, isLoading, error } = useSearchPlanningCenter(debouncedQuery, debouncedQuery.length >= 2);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading && debouncedQuery.length >= 2 && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Buscando...
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-2">
          Erro ao buscar. Tente novamente.
        </div>
      )}

      {!isLoading && debouncedQuery.length >= 2 && people && people.length === 0 && (
        <div className="text-sm text-muted-foreground py-4 text-center">
          Nenhum resultado encontrado para "{debouncedQuery}"
        </div>
      )}

      {people && people.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {people.map((person) => (
            <div
              key={person.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={person.avatar_url || undefined} alt={person.full_name} />
                <AvatarFallback>
                  {person.full_name ? getInitials(person.full_name) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{person.full_name}</p>
                <p className="text-xs text-muted-foreground">ID: {person.id}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onSelect(person)}
              >
                Usar
              </Button>
            </div>
          ))}
        </div>
      )}

      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <div className="text-xs text-muted-foreground">
          Digite pelo menos 2 caracteres para buscar
        </div>
      )}
    </div>
  );
}
