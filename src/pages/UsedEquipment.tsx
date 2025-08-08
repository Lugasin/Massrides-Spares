import React, { useState, useEffect } from 'react';
import { UsedSparePart as UsedSparePartType } from '../data/products'; // Import UsedSparePartType
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase'; // Import Supabase client
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom'; // Import Link
import { Separator } from '@/components/ui/separator'; // Import Separator


const UsedSpareParts: React.FC = () => { 
  const [conditionFilter, setConditionFilter] = useState('All');
  const [sortBy, setSortBy] = useState('price'); // Default sort by price
  const [sortOrder, setSortOrder] = useState('desc'); // Default sort order descending
  const [searchQuery, setSearchQuery] = useState('');
  const [usedSpareParts, setUsedSpareParts] = useState<UsedSparePartType[]>([]); // State to store fetched data
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const fetchUsedSpareParts = async () => {
      const { data, error } = await supabase.from('used_spare_parts').select('*');
      if (error) {
        console.error('Error fetching used spare parts:', error);
        // Optionally set an error state here
      } else {
        setUsedSpareParts(data as UsedSparePartType[]);
      }
      setLoading(false);
    };

    fetchUsedSpareParts();
  }, []);

  const filteredAndSortedSpareParts = usedSpareParts
    .filter(item => {
      // Search filter
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(lowerCaseSearchQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerCaseSearchQuery)) ||
        (item.partNumber && item.partNumber.toLowerCase().includes(lowerCaseSearchQuery));
      if (searchQuery && !matchesSearch) {
        return false;
 item.description.toLowerCase().includes(lowerCaseSearchQuery);
      if (searchQuery && !matchesSearch) {
 return false;
      }
      // Filter by condition
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'price') {
        comparison = a.price - b.price;
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Used Spare Parts</h1>
      
      {/* Filters and Sorting */}
      <div className="mb-6">
        <Input
          placeholder="Search used spare parts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Conditions</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Used">Used</SelectItem>
            <SelectItem value="Refurbished">Refurbished</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price">Price</SelectItem>
          </SelectContent>
        </Select>

         <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger>
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="text-center text-muted-foreground">Loading used spare parts...</div>
      )}


      {/* Used Spare Parts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedSpareParts.map((item: UsedSparePartType) => (
          <Link key={item.id} to={`/used-parts/${item.id}`}> {/* Wrap Card with Link */}
            <Card className="group hover-scale overflow-hidden">
              <div className="relative overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">
                  {item.condition}
                </Badge>
                {!item.inStock && (
                  <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                    Out of Stock
                  </Badge>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2">
                  {item.name}
                </h3>

                {item.partNumber && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Part #: {item.partNumber}
                  </p>
                )}

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  Condition: {item.condition}
                  {item.originalEquipment && ` | From: ${item.originalEquipment}`}
                </p>

                <div className="text-lg font-bold text-primary">
                  ${item.price.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
    </div>
  );
};

export default UsedSpareParts;