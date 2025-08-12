import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { usedSparePartsData, UsedSparePart } from '@/data/products';

const UsedSpareParts: React.FC = () => {
  const [conditionFilter, setConditionFilter] = useState('All');
  const [sortBy, setSortBy] = useState('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSortedSpareParts = useMemo(() => {
    const lower = searchQuery.toLowerCase();
    const base = usedSparePartsData.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(lower) ||
        (item.description && item.description.toLowerCase().includes(lower)) ||
        (item.partNumber && item.partNumber.toLowerCase().includes(lower));

      if (searchQuery && !matchesSearch) return false;
      if (conditionFilter !== 'All' && item.condition !== conditionFilter) return false;
      return true;
    });

    const sorted = [...base].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'price') cmp = a.price - b.price;
      else if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [conditionFilter, sortBy, sortOrder, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Used Spare Parts</h1>

      <div className="mb-6 space-y-4">
        <Input
          placeholder="Search used spare parts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
            <SelectTrigger>
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedSpareParts.map((item: UsedSparePart) => (
          <Link key={item.id} to={`/used-parts/${item.id}`}>
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
                  <p className="text-xs text-muted-foreground mb-2">Part #: {item.partNumber}</p>
                )}

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  Condition: {item.condition}
                  {item.originalEquipment && ` | From: ${item.originalEquipment}`}
                </p>

                <div className="text-lg font-bold text-primary">${item.price.toLocaleString()}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default UsedSpareParts;
