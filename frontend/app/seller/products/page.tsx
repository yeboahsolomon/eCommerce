'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { sellerApi } from '@/lib/seller-api';
import { Product } from '@/types';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function SellerProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  
  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await sellerApi.getMyProducts({ 
        page: pagination.page, 
        limit: pagination.limit,
        search 
      });
      if (res.success && res.data) {
        setProducts(res.data.products);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      toast.error('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, search]);

  useEffect(() => {
     if(products){
        console.log("Seller products loaded", products);
     }
  }, [products]);

  const confirmDelete = (id: string) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await sellerApi.deleteProduct(deleteId);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Products</h1>
           <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Link href="/seller/products/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input 
                placeholder="Search products..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
            />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">Loading...</TableCell>
                </TableRow>
            ) : products.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No products found. Start selling by adding a product!
                    </TableCell>
                </TableRow>
            ) : (
                products?.map((product) => (
                <TableRow key={product?.id || Math.random()}>
                    <TableCell>
                    <div className="relative h-12 w-12 rounded overflow-hidden bg-gray-100">
                        {product?.image ? (
                        <Image src={product.image} alt={product.name || 'Product'} fill className="object-cover" />
                        ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <Package className="h-6 w-6" />
                        </div>
                        )}
                    </div>
                    </TableCell>
                    <TableCell className="font-medium">
                        <div className="truncate max-w-[200px]">{product?.name || 'Unknown Product'}</div>
                        <div className="text-xs text-muted-foreground">{product?.category?.name || 'Uncategorized'}</div>
                    </TableCell>
                    <TableCell>₵{(product?.priceInPesewas || 0) / 100}</TableCell>
                    <TableCell>
                        <span className={product?.stockQuantity && product.stockQuantity <= 5 ? "text-red-600 font-medium" : ""}>
                            {product?.stockQuantity || 0}
                        </span>
                    </TableCell>
                    <TableCell>
                        {product?.inStock ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        ) : (
                             <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Out of Stock</Badge>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Link href={`/seller/products/${product?.id}/edit`}>
                        <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                        </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(product?.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

       {/* Pagination Controls could be added here */}

       <ConfirmDialog
         isOpen={!!deleteId}
         onClose={() => setDeleteId(null)}
         onConfirm={handleDelete}
         title="Delete Product"
         description="Are you sure you want to delete this product? This action cannot be undone."
         confirmText="Delete"
         variant="danger"
         isLoading={isDeleting}
       />
    </div>
  );
}
