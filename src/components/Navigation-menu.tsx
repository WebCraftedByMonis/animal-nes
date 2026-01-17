"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
 
} from "@/components/ui/navigation-menu"

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Job Appication Form",
    href: "/jobApplicantForm",
    description:
      "Form for the applicants who want the job as vetinary doctor and can apply conveniently",
  },
  {
    title: "Job vaccancies form",
    href: "/jobvaccancyform",
    description:
      "Post job vaccancy for your company",
  },
  {
    title: "Applicants",
    href: "/Applicants",
    description:
      "Here are the all applicants who want jobs",
  },
  {
    title: "Job vaccancies post",
    href: "/jobvacancy",
    description: "For sighted users to preview new job listings.",
  },
 
  {
    title: "Quick Job Post Form",
    href: "/quickjobform",
    description:
      "Share a quick job post to hire emplyoee you want.",
  },
  {
    title: "Quick Job Post",
    href: "/traditionaljobposts",
    description:
      "A quick hiring job post.",
  },
]

export function NavigationMenuDemo() {
  return (
    <NavigationMenu>
     <NavigationMenuList className="flex flex-col items-start md:flex-row md:items-center">



        <NavigationMenuItem>
          <NavigationMenuTrigger className="font-normal"><span className="text-green-600 font-semibold">Join</span></NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3 hidden md:block">
                <NavigationMenuLink
                  asChild
                  className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                >
                  <Link href="/">
                    <div className="mb-2 mt-4 text-lg font-medium">
                      Animal-wellness
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Join Animal-wellness as a partner
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <ListItem href="/addCompany" title="Add  Company">
                Register your company let's collab.
              </ListItem>
              <ListItem href="/addPartner" title="Become Partner">
                Join us a vendour .
              </ListItem>
              <ListItem href="/addProduct" title="Add Product">
                Lists your products with us.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>



        <NavigationMenuItem>
          <NavigationMenuTrigger className="font-normal"><span className="text-green-600 font-semibold">View </span></NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex flex-col gap-3 p-4 md:w-[300px] lg:w-[300px] lg:grid-cols-[.75fr_1fr]">
        {/* <li className="row-span-3 hidden md:block">
                <NavigationMenuLink
                  asChild
                  className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                >
                  <Link href="/">
                    <div className="mb-2 mt-4 text-lg font-medium">
                      Animal-wellness
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Join Animal-wellness as a partner
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>       */}
              <ListItem href="/Companies" title="Companies">
               
              </ListItem>
              <ListItem href="/Veternarians" title="Veternarians">
               
              </ListItem>
              <ListItem href="/Sales" title="Sales and Marketing">
               
              </ListItem>
              <ListItem href="/VeterinaryAssistants" title="Veterinary Assistants">

              </ListItem>
              <ListItem href="/Students" title="Students">

              </ListItem>
              <ListItem href="/Farmers" title="Farmers">

              </ListItem>
              <ListItem href="/Faculty" title="Faculty">

              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>


        <NavigationMenuItem>
          <NavigationMenuTrigger className="font-normal"><span className="text-green-600 font-semibold">Animal Marketplace</span></NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex flex-col gap-3 p-4 md:w-[300px] lg:w-[300px] lg:grid-cols-[.75fr_1fr]">
              <ListItem href="/sell" title="Sell Animal">
                List your animals for sale
              </ListItem>
              <ListItem href="/buy" title="Buy Animal">
                Browse animals available for purchase
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className="font-normal"><span className="text-green-600 font-semibold">Career Options</span></NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  title={component.title}
                  href={component.href}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>



       
      
      
        

        

       
      </NavigationMenuList>
    </NavigationMenu>
  )
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"
