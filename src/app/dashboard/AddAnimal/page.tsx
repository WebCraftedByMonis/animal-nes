'use client';

import { useForm, Controller } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FormValues {
  name: string;
  gender: 'MALE' | 'FEMALE';
  age: string;
  weight: number;
  totalPrice: number;
  quantity: number;
  location: string;
  breedId: string;
  castrated: boolean;
  vetCertificate: boolean;
}

export default function AddAnimalForm() {
  const { control, handleSubmit, register, setValue } = useForm<FormValues>({
    defaultValues: {
      gender: 'MALE',
      castrated: false,
      vetCertificate: false,
    },
  });

  const [breeds, setBreeds] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setBreeds([
        { id: 1, name: 'Breed A' },
        { id: 2, name: 'Breed B' },
      ]);
    }, 300);
  }, []);

  const onSubmit = (data: FormValues) => {
    console.log(data);
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Card className="shadow-lg border-green-500">
        <CardContent className="space-y-6">
          <h2 className="text-2xl font-bold text-green-600">Add New Animal</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input {...register('name')} placeholder="Animal name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender</Label>
                <Select onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age</Label>
                <Input {...register('age')} placeholder="e.g. 2 years" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.1" {...register('weight')} />
              </div>
              <div>
                <Label>Total Price ($)</Label>
                <Input type="number" step="0.01" {...register('totalPrice')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input type="number" {...register('quantity')} />
              </div>
              <div>
                <Label>Location</Label>
                <Input {...register('location')} />
              </div>
            </div>

            <div>
              <Label>Breed</Label>
              <Select onValueChange={(value) => setValue('breedId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select breed" />
                </SelectTrigger>
                <SelectContent>
                  {breeds.map((breed) => (
                    <SelectItem key={breed.id} value={String(breed.id)}>
                      {breed.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-4">
              <Controller
                name="castrated"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox id="castrated" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="castrated">Castrated</Label>
                  </div>
                )}
              />
              <Controller
                name="vetCertificate"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox id="vetCertificate" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="vetCertificate">Vet Certificate</Label>
                  </div>
                )}
              />
            </div>

            <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white w-full">
              Submit Animal
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
