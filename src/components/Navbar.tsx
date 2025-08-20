"use client";

import Image from "next/image";
import Link from "next/link";
import { Cat, MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

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
  const [isScrolled, setIsScrolled] = useState(false);
  const { data } = useSWR("/api/cart-count", fetcher, {
    refreshInterval: 5000,
  });

  const cartCount = data?.count || 0;

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 10;
      setIsScrolled(scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
  const hiddenRoutes = ["/login"];
  const shouldHideNavbar =
    pathname.startsWith("/dashboard") || hiddenRoutes.includes(pathname);

  if (shouldHideNavbar) return null;

  const { data: session } = useSession();
  const user = session?.user;

  return (
    <nav
  className={cn(
    "text-foreground w-full border-b transition-all duration-300 fixed top-0 left-0 right-0 z-50",
    isScrolled
      ? "bg-background/75 backdrop-blur-xl border-border/40 shadow-lg supports-[backdrop-filter]:bg-background/60 dark:bg-background/75"
      : "bg-background border-border shadow-sm"
  )}
>
  <div className="flex items-center justify-between px-2 sm:px-4 py-2 w-full"> 
    {/* ↓ py-3 → py-2 reduces vertical padding */}
    
    {/* Logo */}
    <div className="flex items-center gap-2 lg:gap-4 min-w-0">
      <Link href="/" className="shrink-0">
        <Image
          src="/logo.jpg"
          alt="Logo"
          width={180}
          height={50}
          className="h-10 sm:h-12 md:h-14 w-auto object-contain 
                     max-w-[100px] sm:max-w-[140px] md:max-w-[180px]" 
          /* ↓ Reduced h-12 → h-10 etc. */
          priority
        />
      </Link>

          {/* Main nav links - visible on lg+ screens */}
          <div className="hidden lg:flex gap-4 items-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-3">
                {[
                  ["Home", "/"],
                  ["Products", "/products"],
                  ["Nexus News", "/animal-news"],
                  ["Sell Animal", "/sell"],
                  ["Buy Animal", "/buy"],
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
          
          <div className="hidden md:block ">
            <NavigationMenuDemo />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex gap-1 sm:gap-2 items-center shrink-0">
          {/* Theme Toggle - Hidden on mobile */}
          <div className="hidden sm:block">
            <ModeToggle />
          </div>

          {/* Cart Button */}
          <Link href="/cart" className="relative p-1 sm:p-2">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 hover:text-green-600 transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] sm:text-xs rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Animal Cart */}
          <Link href="/animalCart" className="p-1 sm:p-2">
            <Cat className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 hover:text-green-600 transition-colors" />
          </Link>

          {/* Mobile menu - Always visible on small screens */}
          <div className="lg:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                  <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </DrawerTrigger>

              <DrawerContent className="h-[80vh] max-h-[80vh]">
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                </DrawerHeader>

                <div className="flex flex-col px-4 gap-4 overflow-y-auto flex-1">
                  <NavigationMenuDemo />
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
                        className="text-base font-medium text-foreground hover:text-green-500 transition-colors py-2"
                      >
                        {label}
                      </Link>
                    </DrawerClose>
                  ))}

                  <div className="pt-4 border-t">
                    <ModeToggle />
                  </div>
                </div>

                <DrawerFooter className="mt-auto">
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
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none border-none bg-transparent p-0">
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarImage src={user.image || ""} />
                  <AvatarFallback className="text-xs sm:text-sm">
                    {user.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-sm">{user.name}</DropdownMenuLabel>
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
            <Button
              className="bg-green-500 hover:bg-green-600 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-9"
              onClick={() => signIn("google")}
            >
              Sign up
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}