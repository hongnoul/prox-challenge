import compiledPackage from "@/products/omnipro-220/product-dist/v1/package.json";
import { productPackageSchema } from "@/lib/shared/contracts";

export const omniproPackage = productPackageSchema.parse(compiledPackage);
