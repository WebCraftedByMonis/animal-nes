"use client";

import Image from "next/image";
import Link from "next/link";
import { Cat, MenuIcon, } from "lucide-react";
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, } from "react";
import useSWR from "swr";
import { ShoppingCart } from "lucide-react";


import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"


import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { NavigationMenuDemo } from "./Navigation-menu";
import { ModeToggle } from "./ModeToggle";
import { usePathname } from "next/navigation";
const fetcher = (url: string) => fetch(url).then((res) => res.json());


export default function Navbar() {
  const { data } = useSWR("/api/cart-count", fetcher, {
    refreshInterval: 5000, // Optional: auto-refresh every 5 seconds
  });

  const cartCount = data?.count || 0;


  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const res = await fetch("/api/cart-count");
        const data = await res.json();

      } catch (err) {
        console.error("Failed to fetch cart count:", err);
      }
    };

    fetchCartCount();
  }, []);

  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');

  const { data: session } = useSession();
  const user = session?.user;

  if (isDashboard) return null;
  return (
    <nav className="text-foreground w-full border-b border-border bg-background ">
      <div className="flex items-center justify-between px-4 py-3 overflow-visible flex-nowrap gap-4">

        {/* Logo & NavigationMenuDemo (aligned left) */}
      
        <div className="flex items-center gap-4 shrink-0">
        <Link href="/">
          <Image
            src="/logo.jpg"
            alt="Logo"
            width={50}
            height={50}
            className="h-12 w-12 object-contain rounded-full"
          />  </Link>


          {/* Main nav links - visible on md+ screens */}
          <div className="hidden lg:flex  gap-4 items-center shrink-0">
            <NavigationMenu>
              <NavigationMenuList className="gap-3">
                {[
                  ["Home", "/"],
                  ["Products", "/products"],
                  ["Nexus News", "/animal-news"],
                  ["Sell Animal", "/sell"],
                  ["Buy Animal", "/buy"],
                  ["Find Doctor", "/findDoctor"],
                ].map(([label, href]) => (
                  <NavigationMenuItem key={label}>
                    <NavigationMenuLink
                      asChild
                      className={`${navigationMenuTriggerStyle()} font-normal hover:text-green-500`}
                    >
                      <Link href={href}>{label}</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="hidden sm:block">
            <NavigationMenuDemo />
          </div>


        </div>



        <div className="flex gap-2 justingy-center items-center">
          <div className="hidden sm:block">
            <ModeToggle />
          </div>


          {/* Cart Button */}
          <Link href="/cart" className="relative">
            <ShoppingCart className="w-6 h-6 text-green-500 hover:text-green-600 transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          <div className="flex gap-4">
            <Link href="/animalCart"  >
              <Cat className="text-green-500" />
            </Link>

          </div>

          {/* Mobile menu icon - visible on small screens */}
          <div className="md:hidden  shrink-0">

            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" className="p-0"><MenuIcon className="size-6" /></Button>
              </DrawerTrigger>

              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                </DrawerHeader>

                <div className="flex flex-col px-4 gap-4">
                  {[
                    ["Home", "/"],
                    ["Products", "/products"],
                    ["Nexus News", "/animal-news"],
                    ["Sell Animal", "/sell"],
                    ["Buy Animal", "/buy"],
                    ["Find Doctor", "/findDoctor"],
                  ].map(([label, href]) => (
                    <DrawerClose asChild key={label}>
                      <Link
                        href={href}
                        className="text-base font-medium text-foreground hover:text-green-500 transition-colors"
                      >
                        {label}
                      </Link>
                    </DrawerClose>
                  ))}

                  <NavigationMenuDemo />
                  <ModeToggle />
                </div>

                <DrawerFooter className="mt-6">
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full">
                      Close Menu
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>





          </div>

          {/* Avatar & Dropdown */}

          {/* Auth buttons / avatar */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none border-none bg-transparent p-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.image || ""} />
                  <AvatarFallback>
                    {user.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="w-full">
                    Profile
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/orders" className="w-full">
                    Order history
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">

              <Button className="bg-green-500 hover:bg-green-600" onClick={() => signIn('google')}>Sign up</Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
