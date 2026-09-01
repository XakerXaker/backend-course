import { Injectable, NotFoundException } from "@nestjs/common";
import { Category, Product } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

export const CATEGORY_LABELS: Record<Category, string> = {
  PROTEIN: "Протеины",
  AMINO_ACIDS: "Аминокислоты",
  FAT_BURNERS: "Жиросжигатели",
  VITAMINS: "Витамины и минералы",
  ACCESSORIES: "Аксессуары",
};

export interface ProductCategoryGroup {
  category: Category;
  label: string;
  products: Product[];
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({ orderBy: { name: "asc" } });
  }

  // Используется и на /nutrition (полная витрина), и на главной странице
  // (превью) — бизнес-логика группировки живёт в сервисе, а не в контроллере.
  async findCategorized(): Promise<ProductCategoryGroup[]> {
    const products = await this.findAll();

    const grouped = Object.fromEntries(
      Object.values(Category).map((category) => [category, [] as Product[]]),
    ) as Record<Category, Product[]>;

    for (const product of products) {
      grouped[product.category].push(product);
    }

    return Object.entries(grouped).map(([category, categoryProducts]) => ({
      category: category as Category,
      label: CATEGORY_LABELS[category as Category],
      products: categoryProducts,
    }));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException("Товар не найден");
    }

    return product;
  }

  create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: { ...createProductDto, stock: createProductDto.stock ?? 0 },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.product.delete({ where: { id } });
  }
}
