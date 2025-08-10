"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Loader2, FileText, Heart, Home, Activity, Syringe, AlertCircle, Calendar, User, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

// Define form schema
const formSchema = z.object({
  // Owner Information
  name: z.string().min(1, "Owner name is required"),
  contact: z.string().min(1, "Contact is required"),
  address: z.string().min(1, "Address is required"),
  
  // Animal Information
  animalSpecie: z.string().min(1, "Animal species is required"),
  breed: z.string().min(1, "Breed is required"),
  age: z.string().min(1, "Age is required"),
  sex: z.string().min(1, "Sex is required"),
  tag: z.string().optional(),
  use: z.string().optional(),
  
  // Medical History
  mainIssue: z.string().min(1, "Main issue is required"),
  duration: z.string().min(1, "Duration is required"),
  pastIllness: z.string().optional(),
  pastTreatment: z.string().optional(),
  allergies: z.string().optional(),
  surgeries: z.string().optional(),
  
  // Reproductive Information
  reproductiveStatus: z.string().optional(),
  lastEvent: z.string().optional(),
  
  // Management
  diet: z.string().optional(),
  water: z.string().optional(),
  housing: z.string().optional(),
  
  // Production
  milkPerDay: z.string().optional(),
  eggPerDay: z.string().optional(),
  weightGain: z.string().optional(),
  
  // Vaccination
  vaccinationDeworming: z.boolean().optional(),
  lastGiven: z.string().optional(),
  nextDue: z.string().optional(),
  
  // Risk Factors
  newAnimalContact: z.boolean().optional(),
  transport: z.boolean().optional(),
  outbreakNearby: z.boolean().optional(),
  wildlife: z.boolean().optional(),
  parasites: z.boolean().optional(),
  
  // Examination
  examinedBy: z.string().optional(),
  examinationDate: z.string().optional(),
  referalNo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddHistoryFormPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasValues, setHasValues] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contact: "",
      address: "",
      animalSpecie: "",
      breed: "",
      age: "",
      sex: "",
      tag: "",
      use: "",
      mainIssue: "",
      duration: "",
      pastIllness: "",
      pastTreatment: "",
      allergies: "",
      surgeries: "",
      reproductiveStatus: "",
      lastEvent: "",
      diet: "",
      water: "",
      housing: "",
      milkPerDay: "",
      eggPerDay: "",
      weightGain: "",
      vaccinationDeworming: false,
      lastGiven: "",
      nextDue: "",
      newAnimalContact: false,
      transport: false,
      outbreakNearby: false,
      wildlife: false,
      parasites: false,
      examinedBy: "",
      examinationDate: "",
      referalNo: "",
    },
  });

  // Check if form has any values
  useEffect(() => {
    const subscription = form.watch((value) => {
      const hasAnyValue = Object.values(value).some(val => 
        val !== "" && val !== false && val !== undefined
      );
      setHasValues(hasAnyValue);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  function handleCancel() {
    form.reset();
  }

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const response = await axios.post("/api/history-forms", data);
      
      if (response.status === 201) {
        toast.success(`History form created successfully! Reference No: ${response.data.id}`);
        form.reset();
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Failed to create history form");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-green-500 mb-2">Animal History Form</h1>
          <p className="text-gray-600">Complete veterinary health record</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Owner/Farm Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <User className="h-5 w-5" />
                  Owner / Farm Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Owner/Farm name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Phone/Email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Full address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Animal Identification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <FileText className="h-5 w-5" />
                  Animal Identification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="animalSpecie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Species *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select species" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cattle">Cattle</SelectItem>
                            <SelectItem value="Buffalo">Buffalo</SelectItem>
                            <SelectItem value="Goat">Goat</SelectItem>
                            <SelectItem value="Sheep">Sheep</SelectItem>
                            <SelectItem value="Poultry">Poultry</SelectItem>
                            <SelectItem value="Dog">Dog</SelectItem>
                            <SelectItem value="Cat">Cat</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="breed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Breed *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter breed" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 2 years" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sex" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tag/Microchip</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ID number (optional)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="use"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose/Use</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select purpose" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Dairy">Dairy</SelectItem>
                            <SelectItem value="Meat">Meat</SelectItem>
                            <SelectItem value="Breeding">Breeding</SelectItem>
                            <SelectItem value="Work">Work</SelectItem>
                            <SelectItem value="Companion">Companion</SelectItem>
                            <SelectItem value="Guard">Guard</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Presenting Complaint */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <AlertCircle className="h-5 w-5" />
                  Presenting Complaint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mainIssue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main Issue *</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Describe the main problem" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 3 days, 2 weeks" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Medical History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Heart className="h-5 w-5" />
                  Medical History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pastIllness"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Past Illness/Treatment</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Previous medical conditions" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allergies</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Known allergies" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surgeries"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surgeries</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Previous surgeries" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pastTreatment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Past Treatment</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Previous treatments" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Reproductive Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Reproductive Information (if applicable)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reproductiveStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Pregnant">Pregnant</SelectItem>
                            <SelectItem value="Not breeding">Not breeding</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastEvent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Event</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Last calving date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Management & Nutrition */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Home className="h-5 w-5" />
                  Management & Nutrition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="diet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diet</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Feed type/schedule" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="water"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Water Source</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select water source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Clean">Clean</SelectItem>
                            <SelectItem value="Natural">Natural</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="housing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Housing</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select housing type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Stall">Stall</SelectItem>
                            <SelectItem value="Yard">Yard</SelectItem>
                            <SelectItem value="Cage">Cage</SelectItem>
                            <SelectItem value="Free-range">Free-range</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Production Records */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Activity className="h-5 w-5" />
                  Production Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="milkPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Milk/Day (Liters)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Daily milk production" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eggPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eggs/Day</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Daily egg production" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weightGain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight Gain</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 2kg/month" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Vaccination/Deworming */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Syringe className="h-5 w-5" />
                  Vaccination / Deworming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="vaccinationDeworming"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Vaccination/Deworming Done
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastGiven"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Given</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextDue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Due</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <AlertCircle className="h-5 w-5" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <FormField
                    control={form.control}
                    name="newAnimalContact"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          New animal contact
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="transport"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          Transport
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="outbreakNearby"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          Outbreak nearby
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="wildlife"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          Wildlife
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="parasites"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          Parasites
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Examination Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Calendar className="h-5 w-5" />
                  Examination Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="referalNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Auto-generated on save" disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="examinedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Examined By</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Veterinarian name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="examinationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Examination Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4">
              {hasValues && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit History Form"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}