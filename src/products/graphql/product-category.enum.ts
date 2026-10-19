import { registerEnumType } from "@nestjs/graphql";
import { Category } from "@prisma/client";

registerEnumType(Category, {
  name: "ProductCategory",
  description: "Категория товара спортивного питания",
  valuesMap: {
    PROTEIN: { description: "Протеины" },
    AMINO_ACIDS: { description: "Аминокислоты" },
    FAT_BURNERS: { description: "Жиросжигатели" },
    VITAMINS: { description: "Витамины и минералы" },
    ACCESSORIES: { description: "Аксессуары" },
  },
});

export { Category as ProductCategory };
