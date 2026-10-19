export type ProductCategory =
  | "PROTEIN"
  | "AMINO_ACIDS"
  | "FAT_BURNERS"
  | "VITAMINS"
  | "ACCESSORIES";

export class ProductEntity {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  description?: string | null;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}
