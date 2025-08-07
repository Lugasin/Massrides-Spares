import React, { useState, useEffect } from 'react';
import { UsedEquipment as UsedEquipmentType } from '../data/products'; // Import UsedEquipmentType
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase'; // Import Supabase client
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom'; // Import Link
import { Separator } from '@/components/ui/separator'; // Import Separator


const UsedEquipment: React.FC = () => { 
  const [conditionFilter, setConditionFilter] = useState('All');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [minHours, setMinHours] = useState('');
  const [maxHours, setMaxHours] = useState('');
  const [sortBy, setSortBy] = useState('year'); // Default sort by year
  const [sortOrder, setSortOrder] = useState('desc'); // Default sort order descending
  const [searchQuery, setSearchQuery] = useState('');
  const [usedEquipment, setUsedEquipment] = useState<UsedEquipmentType[]>([]); // State to store fetched data
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const fetchUsedEquipment = async () => {
      const { data, error } = await supabase.from('used_equipment').select('*');
      if (error) {
        console.error('Error fetching used equipment:', error);
        // Optionally set an error state here
      } else {
        setUsedEquipment(data as UsedEquipmentType[]);
      }
      setLoading(false);
    };

    fetchUsedEquipment();
  }, []);

  const filteredAndSortedEquipment = usedEquipment
    .filter(item => {
      // Search filter
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(lowerCaseSearchQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerCaseSearchQuery)); // Check if description exists
      if (searchQuery && !matchesSearch) {
        return false;
 item.description.toLowerCase().includes(lowerCaseSearchQuery);
      if (searchQuery && !matchesSearch) {
 return false;
      }
      // Filter by condition
        return false;
      }
      // Filter by year range
      if (minYear && item.year < parseInt(minYear)) {
        return false;
      }
      if (maxYear && item.year > parseInt(maxYear)) {
        return false;
      }
      // Filter by hours range
      if (minHours && item.hours_of_use < parseInt(minHours)) {
        return false;
      }
      if (maxHours && item.hours_of_use > parseInt(maxHours)) {
        return false;
      }
      // Filter out sold items by default (can add a toggle later)
      if (item.is_sold) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'year') {
        comparison = a.year - b.year;
      } else if (sortBy === 'price') {
        comparison = a.price - b.price;
      } else if (sortBy === 'hours_of_use') {
        comparison = a.hours_of_use - b.hours_of_use;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Used Equipment</h1>
      
      {/* Filters and Sorting */}
      <div className="mb-6">
        <Input
          placeholder="Search used equipment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Conditions</SelectItem>
            {/* Add specific condition options here later */}
          </SelectContent>
        </Select>

        <div>
          <Label htmlFor="min-year">Min Year</Label>
          <Input id="min-year" type="number" value={minYear} onChange={(e) => setMinYear(e.target.value)} placeholder="e.g., 2010" />
        </div>
        <div>
           <Label htmlFor="max-year">Max Year</Label>
          <Input id="max-year" type="number" value={maxYear} onChange={(e) => setMaxYear(e.target.value)} placeholder="e.g., 2022" />
        </div>

         <div>
           <Label htmlFor="min-hours">Min Hours</Label>
           <Input id="min-hours" type="number" value={minHours} onChange={(e) => setMinHours(e.target.value)} placeholder="e.g., 500" />
        </div>
        <div>
           <Label htmlFor="max-hours">Max Hours</Label>
           <Input id="max-hours" type="number" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} placeholder="e.g., 3000" />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="year">Year</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="hours_of_use">Hours of Use</SelectItem>
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
        <div className="text-center text-muted-foreground">Loading used equipment...</div>
      )}


      {/* Used Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedEquipment.map((item: UsedEquipmentType) => (
          <Link key={item.id} to={`/used-equipment/${item.id}`}> {/* Wrap Card with Link */}
            {/* Add a condition here to visually indicate if sold */}
            <Card className="group hover-scale overflow-hidden">
              <div className="relative overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">
                  Used
                </Badge>
                {!item.inStock && (
                  <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                    Out of Stock
                  </Badge>
                )}
                {item.is_sold && (
                  <Badge className="absolute top-2 right-2 bg-gray-500 text-white">
                    Sold
                  </Badge>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2">
                  {item.name} ({item.year})
                </h3>

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  Condition: {item.condition} | Hours: {item.hours_of_use}
                </p>

                {/* Add more details or a "View Details" button here if needed */}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
    </div>
  );
};

export default UsedEquipment;